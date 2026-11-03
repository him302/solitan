import { AssistantService } from './assistant.service';
import type { AppConfigService } from '../config/app-config.service';
import { answerLocally, groundingContext, tokenize } from './local-assistant';
import { extractText, resolveGeminiConfig, askGemini } from './gemini.provider';
import { KNOWLEDGE_BASE } from './knowledge-base';

function configStub(freeLocalMode: boolean): AppConfigService {
  return { freeLocalMode } as unknown as AppConfigService;
}

/** Builds the service with a controlled environment, since config is read at construction. */
function buildService(env: Record<string, string | undefined>, freeLocalMode = false) {
  const previous = { ...process.env };
  Object.assign(process.env, env);
  try {
    return new AssistantService(configStub(freeLocalMode));
  } finally {
    process.env = previous;
  }
}

describe('local knowledge retrieval', () => {
  it('answers the questions Part 12 lists for customers', () => {
    const questions = [
      'How does Solitan work?',
      'How do I join a queue?',
      'Where is my token?',
      'Why has my waiting time increased?',
      'What happens if I arrive late?',
      'How do I cancel my queue?',
      'How do I contact a business?',
      'How does the live queue work?',
    ];
    for (const question of questions) {
      const result = answerLocally(question, 'customer');
      expect(result.unmatched).toBe(false);
      expect(result.answer.length).toBeGreaterThan(40);
    }
  });

  it('answers the questions Part 12 lists for owners', () => {
    const questions = [
      'How do I manage my queue?',
      'How do I add staff?',
      'How can I reduce waiting time?',
      'How should I manage peak hours?',
      'How do I handle delayed services?',
      'How do I manage multiple staff members?',
      'How can I improve customer experience?',
    ];
    for (const question of questions) {
      const result = answerLocally(question, 'owner');
      expect(result.unmatched).toBe(false);
      expect(result.answer.length).toBeGreaterThan(40);
    }
  });

  it('matches loosely worded questions, not just the canonical phrasing', () => {
    expect(answerLocally('how do i get a token', 'customer').unmatched).toBe(false);
    expect(answerLocally('my wait got longer, why?', 'customer').unmatched).toBe(false);
    expect(answerLocally('need to add an employee', 'owner').unmatched).toBe(false);
  });

  it('routes to the right entry rather than any entry mentioning queues', () => {
    const { answer } = answerLocally('how do I cancel my queue', 'customer');
    expect(answer).toMatch(/leave the queue|released/i);
  });

  it('admits it does not know instead of returning the least-bad entry', () => {
    const result = answerLocally('what is the capital of Mongolia', 'customer');
    expect(result.unmatched).toBe(true);
    expect(result.answer).toMatch(/could not find/i);
    // A dead end is still given somewhere to go.
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('keeps owner-only guidance out of customer answers', () => {
    const result = answerLocally('how do I add staff', 'customer');
    // There is no customer-facing answer for this, so it must not leak the owner one.
    expect(result.unmatched).toBe(true);
  });

  it('offers near-misses as suggestions', () => {
    const result = answerLocally('queue', 'owner');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('drops stop words so they cannot outvote real terms', () => {
    expect(tokenize('How do I cancel my queue?')).toEqual(['cancel', 'queue']);
  });

  it('every knowledge entry is reachable by its own question', () => {
    // Guards against an entry being added with keywords that never match it.
    for (const entry of KNOWLEDGE_BASE) {
      const audience = entry.audience === 'both' ? 'customer' : entry.audience;
      const result = answerLocally(entry.question, audience);
      expect(result.unmatched).toBe(false);
    }
  });

  it('grounding context carries real knowledge, so the model cannot invent features', () => {
    const context = groundingContext('customer', 'how do I join a queue');
    expect(context).toMatch(/Q: /);
    expect(context).toMatch(/A: /);
    expect(context.length).toBeGreaterThan(200);
  });
});

describe('mode honesty (Part 12)', () => {
  it('reports local mode with no fallback reason when Gemini was never configured', async () => {
    const service = buildService({ ASSISTANT_PROVIDER: undefined, GEMINI_API_KEY: undefined });
    const answer = await service.ask({ question: 'How do I join a queue?', audience: 'customer' });

    expect(answer.mode).toBe('local');
    // Not a failure, so nothing to explain.
    expect(answer.fallbackReason).toBeNull();
  });

  it('never claims Gemini when answering locally', async () => {
    const service = buildService({ ASSISTANT_PROVIDER: 'gemini', GEMINI_API_KEY: 'k' }, true);
    const answer = await service.ask({ question: 'How do I join a queue?', audience: 'customer' });

    expect(answer.mode).toBe('local');
    expect(answer.fallbackReason).toBe('disabled_by_policy');
  });

  it('status advertises local when no key is present', () => {
    const service = buildService({ ASSISTANT_PROVIDER: undefined, GEMINI_API_KEY: undefined });
    const status = service.status();

    expect(status.activeMode).toBe('local');
    expect(status.geminiConfigured).toBe(false);
    expect(status.examples.length).toBeGreaterThan(0);
  });

  it('status reports Gemini configured but inactive under free-local mode', () => {
    const service = buildService({ ASSISTANT_PROVIDER: 'gemini', GEMINI_API_KEY: 'k' }, true);
    const status = service.status();

    expect(status.geminiConfigured).toBe(true);
    // Configured is not the same as answering, and the two are reported separately.
    expect(status.activeMode).toBe('local');
  });
});

describe('Gemini configuration', () => {
  it('stays off unless both the provider and a key are set', () => {
    expect(resolveGeminiConfig({})).toBeNull();
    expect(resolveGeminiConfig({ GEMINI_API_KEY: 'k' })).toBeNull();
    expect(resolveGeminiConfig({ ASSISTANT_PROVIDER: 'gemini' })).toBeNull();
    expect(resolveGeminiConfig({ ASSISTANT_PROVIDER: 'gemini', GEMINI_API_KEY: '   ' })).toBeNull();
  });

  it('activates only on an explicit opt-in', () => {
    const config = resolveGeminiConfig({ ASSISTANT_PROVIDER: 'gemini', GEMINI_API_KEY: 'k' });
    expect(config).toEqual({ apiKey: 'k', model: 'gemini-2.5-flash' });
  });

  it('allows the model to be overridden, since free-tier eligibility changes', () => {
    const config = resolveGeminiConfig({
      ASSISTANT_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'k',
      GEMINI_MODEL: 'gemini-2.5-flash-lite',
    });
    expect(config?.model).toBe('gemini-2.5-flash-lite');
  });
});

describe('Gemini failure handling', () => {
  const config = { apiKey: 'test-key', model: 'gemini-2.5-flash' };

  it('treats a 429 as an expected outcome, not an error', async () => {
    const fetchStub = jest.fn().mockResolvedValue({ status: 429, ok: false });
    const result = await askGemini(config, 'q', 'context', fetchStub as unknown as typeof fetch);

    expect(result).toEqual({ ok: false, reason: 'quota_exceeded' });
  });

  it('reports a rejected key distinctly from an outage', async () => {
    const rejected = jest.fn().mockResolvedValue({ status: 403, ok: false });
    await expect(
      askGemini(config, 'q', 'c', rejected as unknown as typeof fetch),
    ).resolves.toEqual({ ok: false, reason: 'provider_error' });

    const down = jest.fn().mockResolvedValue({ status: 503, ok: false });
    await expect(askGemini(config, 'q', 'c', down as unknown as typeof fetch)).resolves.toEqual({
      ok: false,
      reason: 'provider_unavailable',
    });
  });

  it('never throws on a network failure', async () => {
    const fetchStub = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await askGemini(config, 'q', 'c', fetchStub as unknown as typeof fetch);

    expect(result).toEqual({ ok: false, reason: 'provider_unavailable' });
  });

  it('sends the key as a header, never in the URL', async () => {
    const fetchStub = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }),
    });
    await askGemini(config, 'q', 'c', fetchStub as unknown as typeof fetch);

    const [url, init] = fetchStub.mock.calls[0];
    // A key in a query string ends up in proxy and access logs.
    expect(String(url)).not.toContain('test-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
  });

  it('makes exactly one attempt — retrying a rate-limited free tier is how it stops being free', async () => {
    const fetchStub = jest.fn().mockResolvedValue({ status: 429, ok: false });
    await askGemini(config, 'q', 'c', fetchStub as unknown as typeof fetch);

    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('degrades rather than throwing when the response shape changes', () => {
    expect(extractText({})).toBeNull();
    expect(extractText({ candidates: [] })).toBeNull();
    expect(extractText({ candidates: [{ content: { parts: [] } }] })).toBeNull();
    expect(extractText({ candidates: [{ content: { parts: [{ text: '  ' }] } }] })).toBeNull();
    expect(extractText({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })).toBe('ok');
  });
});
