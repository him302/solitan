import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildRealtimeEvent,
  salonRoom,
  type CreateMockPaymentInput,
  type PaymentDto,
  type PaymentStatus,
} from '@soliton/api-contract';
import type { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { MockPaymentProvider } from './mock-payment.provider';
import { logger } from '../../common/logging/logger';

const VALID_TRANSITIONS: Partial<Record<string, string[]>> = {
  none: ['pending'],
  pending: ['paid', 'refunded'],
  paid: ['refunded'],
};

const paymentSelect = {
  id: true,
  customerId: true,
  salonId: true,
  appointmentId: true,
  entryId: true,
  amountCents: true,
  currency: true,
  status: true,
  provider: true,
  providerRef: true,
  createdAt: true,
  updatedAt: true,
  salon: { select: { name: true } },
} as const;

type PaymentWithRelations = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

function toDto(p: PaymentWithRelations): PaymentDto {
  return {
    id: p.id,
    customerId: p.customerId,
    salonId: p.salonId,
    salonName: p.salon?.name ?? null,
    appointmentId: p.appointmentId,
    entryId: p.entryId,
    amountCents: p.amountCents,
    currency: p.currency,
    status: p.status as PaymentStatus,
    provider: p.provider,
    providerRef: p.providerRef,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function assertTransition(from: string, to: string) {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(`Invalid payment transition: ${from} → ${to}`);
  }
}

@Injectable()
export class PaymentsService {
  private io: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly mock: MockPaymentProvider,
  ) {}

  setIo(io: Server) {
    this.io = io;
  }

  private requireMockEnabled() {
    if (!this.config.mockPaymentsEnabled) {
      throw new ServiceUnavailableException(
        'Mock payments are disabled. Set MOCK_PAYMENTS_ENABLED=true in development.',
      );
    }
  }

  /** Create a new mock payment (PENDING). */
  async createMock(customerId: string, input: CreateMockPaymentInput): Promise<PaymentDto> {
    this.requireMockEnabled();

    const intent = await this.mock.createPaymentIntent({
      amountCents: input.amountCents,
      currency: input.currency ?? 'INR',
      customerId,
      reference: `${customerId}_${Date.now()}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        customerId,
        salonId: input.salonId ?? null,
        appointmentId: input.appointmentId ?? null,
        entryId: input.entryId ?? null,
        amountCents: input.amountCents,
        currency: input.currency ?? 'INR',
        status: 'pending',
        provider: 'mock',
        providerRef: intent.providerRef,
      },
      select: paymentSelect,
    });

    logger.info({ paymentId: payment.id, customerId }, 'mock payment created');
    return toDto(payment);
  }

  /** Simulate a successful payment (dev only). */
  async mockSucceed(customerId: string, paymentId: string): Promise<PaymentDto> {
    this.requireMockEnabled();
    const payment = await this.findOwnedBy(customerId, paymentId);
    assertTransition(payment.status, 'paid');

    if (payment.providerRef) this.mock.simulateSuccess(payment.providerRef);

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'paid' },
      select: paymentSelect,
    });

    this.emit('payment:updated', updated);
    return toDto(updated);
  }

  /** Simulate a failed payment (dev only). */
  async mockFail(customerId: string, paymentId: string): Promise<PaymentDto> {
    this.requireMockEnabled();
    const payment = await this.findOwnedBy(customerId, paymentId);
    assertTransition(payment.status, 'refunded');

    if (payment.providerRef) this.mock.simulateFailure(payment.providerRef);

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'refunded' },
      select: paymentSelect,
    });

    this.emit('payment:updated', updated);
    return toDto(updated);
  }

  /** Refund a paid payment. */
  async refund(customerId: string, paymentId: string): Promise<PaymentDto> {
    const payment = await this.findOwnedBy(customerId, paymentId);
    assertTransition(payment.status, 'refunded');

    if (payment.providerRef) {
      await this.mock.refundPayment(payment.providerRef, payment.amountCents);
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'refunded' },
      select: paymentSelect,
    });

    this.emit('payment:refunded', updated);
    logger.info({ paymentId }, 'payment refunded');
    return toDto(updated);
  }

  async listMine(
    customerId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: PaymentDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.payment.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: paymentSelect,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items: items.map(toDto), nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async adminList(
    cursor?: string,
    limit = 20,
    status?: string,
  ): Promise<{ items: PaymentDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.payment.findMany({
      where: status ? { status: status as Prisma.PaymentWhereInput['status'] } : {},
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: paymentSelect,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items: items.map(toDto), nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findOwnedBy(customerId: string, paymentId: string) {
    const p = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { ...paymentSelect, customerId: true },
    });
    if (!p) throw new NotFoundException('Payment not found');
    if (p.customerId !== customerId) throw new ForbiddenException('Not your payment');
    return { ...toDto(p), status: p.status, providerRef: p.providerRef, amountCents: p.amountCents };
  }

  private emit(type: string, payment: PaymentWithRelations) {
    if (!this.io || !payment.salonId) return;
    this.io.to(salonRoom(payment.salonId)).emit(
      'event',
      buildRealtimeEvent({ type, entityId: payment.id, version: 0 }),
    );
  }
}
