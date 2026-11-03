import type { AssistantFallbackReason } from '@soliton/api-contract';
import { logger } from '../../common/logging/logger';

/**
 * Optional Gemini integration (Part 12).
 *
 * Everything about this is designed so the assistant degrades rather than breaks, and so
 * no cost can be incurred by accident:
 *
 *  - Off unless an operator sets GEMINI_API_KEY and ASSISTANT_PROVIDER=gemini. There is
 *    no default key and none is committed.
 *  - The key is read from server environment only. It is never returned in a response or
 *    sent to a client, so it cannot leak into a mobile bundle.
 *  - Quota exhaustion (HTTP 429) is treated as an ordinary outcome, not an exception.
 *    Google does not publish per-model free-tier quotas and third-party figures disagree,
 *    so no limit is encoded here — the only safe assumption is that a 429 can arrive at
 *    any time, and when it does the local assistant answers instead.
 *  - A short timeout, one attempt, no retries. Retrying a rate-limited free-tier endpoint
 *    is how a free tier turns into a billed one.
 *  - Answers are grounded in the local knowledge base, so the model describes how Solitan
 *    actually works rather than inventing plausible-sounding features.
 */

/** Chosen for the free tier: Flash models are the ones that have stayed free-eligible. */
const DEFAULT_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_OUTPUT_TOKENS = 400;

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export type GeminiResult =
  | { ok: true; answer: string }
  | { ok: false; reason: AssistantFallbackReason };

const SYSTEM_PREAMBLE = [
  'You are the Solitan assistant. Solitan is a live queue-management app: customers join',
  'a salon queue remotely, watch their position and arrive when their turn is near.',
  '',
  'Rules:',
  '- Answer only from the reference material below. If it does not cover the question,',
  '  say you do not know and suggest contacting the salon. Never invent features.',
  '- Solitan is not an appointment-booking app; its primary flow is joining a live queue.',
  '- Waiting times are always estimates. Never state one as a guarantee.',
  '- Be brief and plain. Two or three sentences. No markdown, no bullet lists.',
].join('\n');

/**
 * Resolves configuration from the environment, returning null when the assistant should
 * stay local. Absence is the normal case, not an error.
 */
export function resolveGeminiConfig(env: NodeJS.ProcessEnv): GeminiConfig | null {
  if (env.ASSISTANT_PROVIDER !== 'gemini') return null;
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, model: env.GEMINI_MODEL?.trim() || DEFAULT_MODEL };
}

/**
 * Asks Gemini a grounded question.
 *
 * Never throws: every failure path returns a reason the caller can report honestly.
 */
export async function askGemini(
  config: GeminiConfig,
  question: string,
  grounding: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeminiResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.model,
  )}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Header rather than a query parameter, so the key cannot end up in a URL that
        // gets logged by a proxy or an access log.
        'x-goog-api-key': config.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PREAMBLE }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Reference material:\n\n${grounding}\n\nQuestion: ${question}` }],
          },
        ],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.2 },
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      // Expected on a free tier. Not logged as an error.
      logger.info({ event: 'assistant_quota_exceeded' }, 'assistant_quota_exceeded');
      return { ok: false, reason: 'quota_exceeded' };
    }

    if (response.status === 401 || response.status === 403) {
      logger.warn(
        { event: 'assistant_auth_rejected', status: response.status },
        'Gemini rejected the configured key',
      );
      return { ok: false, reason: 'provider_error' };
    }

    if (!response.ok) {
      logger.warn(
        { event: 'assistant_provider_error', status: response.status },
        'assistant_provider_error',
      );
      return { ok: false, reason: 'provider_unavailable' };
    }

    const body = (await response.json()) as GeminiResponseBody;
    const answer = extractText(body);
    if (!answer) return { ok: false, reason: 'provider_error' };

    return { ok: true, answer };
  } catch (err) {
    // Includes the abort from our own timeout.
    logger.warn({ event: 'assistant_provider_unavailable', err }, 'assistant_provider_unavailable');
    return { ok: false, reason: 'provider_unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

interface GeminiResponseBody {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

/** Pulls the text out defensively: a shape change must degrade, not throw. */
export function extractText(body: GeminiResponseBody): string | null {
  const parts = body.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((part) => part?.text ?? '')
    .join('')
    .trim();
  return text.length > 0 ? text : null;
}
