import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  askAssistantSchema,
  type AskAssistantInput,
  type AssistantAnswerDto,
  type AssistantStatusDto,
} from '@soliton/api-contract';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ZodPipe } from '../../common/validation/zod.pipe';
import { AssistantService } from './assistant.service';

/**
 * Solitan AI Assistant (Part 12).
 *
 * Open to signed-out users: someone evaluating the app should be able to ask how it works
 * before creating an account. It reads nothing about the caller and returns no
 * account-specific data, so there is nothing to protect — but it is rate limited, because
 * when Gemini is enabled each question can consume a quota somebody is paying for in
 * requests.
 */
@ApiTags('assistant')
@Controller({ path: 'assistant', version: '1' })
@UseGuards(ThrottlerGuard, OptionalJwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  /** Which engine will answer, and what it is good at. Used for the empty state. */
  @Get('status')
  status(): AssistantStatusDto {
    return this.assistant.status();
  }

  @Post('ask')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  ask(
    @Body(new ZodPipe(askAssistantSchema)) body: AskAssistantInput,
  ): Promise<AssistantAnswerDto> {
    return this.assistant.ask(body);
  }
}
