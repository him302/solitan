/**
 * Solitan AI Assistant contracts (Part 12).
 *
 * The assistant answers questions about using Solitan. It has two modes and is always
 * explicit about which one answered:
 *
 *  - `local`  a curated, rule-based knowledge base that ships with the app. Always
 *             available, needs no network, no account and no key. This is the default.
 *  - `gemini` Google's Gemini API, used only when an operator has supplied a key and
 *             explicitly enabled it.
 *
 * Part 12 forbids the fallback ever presenting itself as Gemini, so `mode` is a required
 * field on every answer rather than an optional hint, and the UI shows it.
 *
 * On verifying the free tier (Part 12 asks for this before implementing): Google does
 * publish a free tier that does not require a billing account, but it does not publish
 * per-model free-tier quotas in its public documentation, and third-party summaries
 * disagree with each other substantially. No quota figures are therefore encoded
 * anywhere in this codebase. The integration treats quota exhaustion (HTTP 429) as an
 * ordinary, expected outcome and falls back to `local`, so a changed or withdrawn free
 * tier degrades the assistant rather than breaking the app or incurring a charge.
 */
import { z } from 'zod';

/** Which engine produced an answer. Never inferred — always stated. */
export type AssistantMode = 'local' | 'gemini';

/** Whose question set applies. Owners and customers ask different things (Part 12). */
export const assistantAudienceSchema = z.enum(['customer', 'owner']);
export type AssistantAudience = z.infer<typeof assistantAudienceSchema>;

export const askAssistantSchema = z
  .object({
    question: z.string().trim().min(3).max(500),
    /**
     * Defaults to customer. The server does not trust this for authorization — it only
     * selects which knowledge to search; owner answers contain no customer data.
     */
    audience: assistantAudienceSchema.default('customer'),
  })
  .strict();
export type AskAssistantInput = z.infer<typeof askAssistantSchema>;

export interface AssistantAnswerDto {
  /** The answer text, in plain language. */
  answer: string;
  /** Which engine answered. Displayed to the user; see the module comment. */
  mode: AssistantMode;
  /**
   * Set when `mode` is 'local' and Gemini was configured but could not be used, so the
   * interface can say why rather than silently differing. Null when Gemini was never
   * enabled, which is not a failure.
   */
  fallbackReason: AssistantFallbackReason | null;
  /**
   * Related questions the assistant can also answer, offered when confidence is low so a
   * near-miss leads somewhere useful instead of a dead end.
   */
  suggestions: string[];
  /**
   * True when the local knowledge base found nothing close. The answer is then a generic
   * pointer rather than a real response, and the UI should offer human support.
   */
  unmatched: boolean;
}

export type AssistantFallbackReason =
  /** Quota exhausted (HTTP 429). Expected, not exceptional. */
  | 'quota_exceeded'
  /** Network, timeout, or a 5xx from the provider. */
  | 'provider_unavailable'
  /** The provider returned something unusable. */
  | 'provider_error'
  /** Free-local mode forbids outbound calls. */
  | 'disabled_by_policy';

/** Capability advertisement, so the UI can set expectations before the first question. */
export interface AssistantStatusDto {
  /** The mode that will answer a question right now. */
  activeMode: AssistantMode;
  /** True when an operator has configured and enabled Gemini. */
  geminiConfigured: boolean;
  /** Questions this assistant is known to answer well, for the empty state. */
  examples: string[];
}
