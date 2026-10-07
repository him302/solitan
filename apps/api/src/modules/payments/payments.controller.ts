import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  createMockPaymentSchema,
  mockPaymentActionSchema,
  type CreateMockPaymentInput,
  type MockPaymentActionInput,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodPipe } from '../../common/validation/zod.pipe';
import { PaymentsService } from './payments.service';

@Controller({ path: 'payments', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** POST /payments/mock/create — create a pending mock payment (DEVELOPMENT ONLY). */
  @Post('mock/create')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createMockPaymentSchema)) body: CreateMockPaymentInput,
  ) {
    return this.payments.createMock(user.id, body);
  }

  /** POST /payments/mock/succeed — simulate payment success (DEVELOPMENT ONLY). */
  @Post('mock/succeed')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  succeed(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(mockPaymentActionSchema)) body: MockPaymentActionInput,
  ) {
    return this.payments.mockSucceed(user.id, body.paymentId);
  }

  /** POST /payments/mock/fail — simulate payment failure (DEVELOPMENT ONLY). */
  @Post('mock/fail')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  fail(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(mockPaymentActionSchema)) body: MockPaymentActionInput,
  ) {
    return this.payments.mockFail(user.id, body.paymentId);
  }

  /** POST /payments/mock/refund — refund a payment. */
  @Post('mock/refund')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  refund(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(mockPaymentActionSchema)) body: MockPaymentActionInput,
  ) {
    return this.payments.refund(user.id, body.paymentId);
  }
}

@Controller({ path: 'me/payments', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class MyPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payments.listMine(user.id, cursor, limit ? parseInt(limit, 10) : 20);
  }
}
