import { Injectable } from '@nestjs/common';
import type {
  AskAssistantInput,
  AssistantAnswerDto,
  AssistantStatusDto,
} from '@soliton/api-contract';
import { logger } from '../../common/logging/logger';
import { AppConfigService } from '../config/app-config.service';
import { exampleQuestions } from './knowledge-base';
import { answerLocally, groundingContext } from './local-assistant';
import { askGemini, resolveGeminiConfig, type GeminiConfig } from './gemini.provider';

/**
 * The Solitan assistant (Part 12).
 *
 * Local knowledge answers by default and always works offline. Gemini is used only when
 * an operator has configured it, and any failure — quota, network, bad key, a policy that
 * forbids outbound calls — falls back to local with the reason recorded.
 *
 * The returned `mode` always names the engine that actually answered. Part 12 forbids the
 * fallback presenting itself as Gemini, so the two cannot diverge: mode is set from which
 * branch produced the text, not from configuration.
 */
@Injectable()
export class AssistantService {
  private readonly gemini: GeminiConfig | null;

  constructor(private readonly config: AppConfigService) {
    this.gemini = resolveGeminiConfig(process.env);

    if (this.gemini) {
      logger.info(
        { event: 'assistant_mode', mode: 'gemini', model: this.gemini.model },
        'Assistant will use Gemini with local fallback',
      );
    } else {
      logger.info(
        { event: 'assistant_mode', mode: 'local' },
        'Assistant will use the local knowledge base',
      );
    }
  }

  status(): AssistantStatusDto {
    return {
      activeMode: this.geminiUsable() ? 'gemini' : 'local',
      geminiConfigured: this.gemini !== null,
      examples: exampleQuestions('customer'),
    };
  }

  async ask(input: AskAssistantInput): Promise<AssistantAnswerDto> {
    const local = answerLocally(input.question, input.audience);

    if (!this.gemini) {
      // Not a fallback: local is the configured engine, so there is nothing to explain.
      return { ...local, mode: 'local', fallbackReason: null };
    }

    if (!this.geminiUsable()) {
      return { ...local, mode: 'local', fallbackReason: 'disabled_by_policy' };
    }

    const result = await askGemini(
      this.gemini,
      input.question,
      groundingContext(input.audience, input.question),
    );

    if (!result.ok) {
      // The local answer was computed first precisely so this path costs nothing extra.
      return { ...local, mode: 'local', fallbackReason: result.reason };
    }

    return {
      answer: result.answer,
      mode: 'gemini',
      fallbackReason: null,
      // Suggestions still come from the curated set: they are navigation, not generation,
      // and must only offer questions the assistant can actually answer.
      suggestions: local.suggestions,
      unmatched: false,
    };
  }

  /**
   * Free-local mode exists to guarantee no outbound paid calls. Gemini's free tier is not
   * a paid call, but the flag's promise is that Solitan does not reach outside this
   * machine, so it is honoured literally rather than interpreted.
   */
  private geminiUsable(): boolean {
    return this.gemini !== null && !this.config.freeLocalMode;
  }
}
