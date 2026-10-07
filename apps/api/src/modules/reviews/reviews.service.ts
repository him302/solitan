import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildRealtimeEvent,
  salonRoom,
  type AdminModerateReviewInput,
  type CreateReviewInput,
  type RatingDistribution,
  type ReviewDto,
  type ReviewEventType,
  type ReviewStatus,
  type SalonRatingSummary,
  type UpdateReviewInput,
} from '@soliton/api-contract';
import type { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/logging/logger';

/** Customer may edit their review within this window. */
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const reviewSelect = {
  id: true,
  salonId: true,
  customerId: true,
  appointmentId: true,
  entryId: true,
  rating: true,
  comment: true,
  status: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
  salon: { select: { name: true } },
  customer: { select: { name: true } },
} as const;

type ReviewWithRelations = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

function toDto(r: ReviewWithRelations): ReviewDto {
  return {
    id: r.id,
    salonId: r.salonId,
    salonName: r.salon.name,
    customerId: r.customerId,
    customerName: r.customer.name,
    appointmentId: r.appointmentId,
    entryId: r.entryId,
    rating: r.rating,
    comment: r.comment,
    status: r.status as ReviewStatus,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class ReviewsService {
  private io: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  setIo(io: Server) {
    this.io = io;
  }

  /** Create a review for a completed appointment. */
  async create(customerId: string, input: CreateReviewInput): Promise<ReviewDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      select: { id: true, customerId: true, salonId: true, status: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.customerId !== customerId) throw new ForbiddenException('Not your appointment');
    if (appointment.status !== 'completed') {
      throw new BadRequestException('Can only review completed appointments');
    }

    const existing = await this.prisma.review.findUnique({
      where: { appointmentId: input.appointmentId },
    });
    if (existing) throw new ConflictException('Review already submitted for this appointment');

    const review = await this.prisma.$transaction(async (tx) => {
      const rev = await tx.review.create({
        data: {
          salonId: appointment.salonId,
          customerId,
          appointmentId: input.appointmentId,
          rating: input.rating,
          comment: input.comment ?? null,
          status: 'published',
        },
        select: reviewSelect,
      });

      // Update salon denormalized rating
      await this.recomputeSalonRating(tx, appointment.salonId);

      return rev;
    });

    this.emit('review:created', review.salonId, review.id);

    this.notifications.send(customerId, 'APPOINTMENT_COMPLETED', {
      message: 'Thanks for your review!',
      salonName: review.salon.name,
    }).catch(() => {});

    logger.info({ reviewId: review.id, customerId }, 'review created');
    return toDto(review);
  }

  /** Update review within the edit window. */
  async update(customerId: string, reviewId: string, input: UpdateReviewInput): Promise<ReviewDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: reviewSelect,
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.customerId !== customerId) throw new ForbiddenException('Not your review');
    if (review.status === 'removed') throw new BadRequestException('Review has been removed');

    const ageMsMs = Date.now() - review.createdAt.getTime();
    if (ageMsMs > EDIT_WINDOW_MS) {
      throw new BadRequestException('Review edit window has closed (24 hours after submission)');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const rev = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...(input.rating !== undefined && { rating: input.rating }),
          ...(input.comment !== undefined && { comment: input.comment }),
        },
        select: reviewSelect,
      });
      await this.recomputeSalonRating(tx, rev.salonId);
      return rev;
    });

    this.emit('review:updated', updated.salonId, updated.id);
    return toDto(updated);
  }

  /** Get a single review. */
  async getOne(reviewId: string): Promise<ReviewDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: reviewSelect,
    });
    if (!review) throw new NotFoundException('Review not found');
    return toDto(review);
  }

  /** List published reviews for a salon (paginated). */
  async listForSalon(
    salonId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ReviewDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.review.findMany({
      where: { salonId, status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: reviewSelect,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map(toDto),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  /** List reviews by the authenticated customer. */
  async listMine(
    customerId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ReviewDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.review.findMany({
      where: { customerId, status: { not: 'removed' } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: reviewSelect,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map(toDto),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  /** Check if customer has already reviewed an appointment. */
  async getForAppointment(customerId: string, appointmentId: string): Promise<ReviewDto | null> {
    const review = await this.prisma.review.findUnique({
      where: { appointmentId },
      select: reviewSelect,
    });
    if (!review || review.customerId !== customerId) return null;
    return toDto(review);
  }

  /** Get salon rating summary. */
  async getRatingSummary(salonId: string): Promise<SalonRatingSummary> {
    const [agg, byRating] = await Promise.all([
      this.prisma.review.aggregate({
        where: { salonId, status: 'published' },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { salonId, status: 'published' },
        _count: { _all: true },
      }),
    ]);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
    for (const r of byRating) {
      distribution[r.rating] = r._count._all;
    }

    return {
      average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      count: agg._count._all,
      distribution: distribution as unknown as RatingDistribution,
    };
  }

  // ── Salon-facing ──────────────────────────────────────────────────────────

  /** List all reviews for the authenticated salon owner/staff. */
  async listForSalonOwner(
    userId: string,
    cursor?: string,
    limit = 20,
    status?: ReviewStatus,
  ): Promise<{ items: ReviewDto[]; nextCursor: string | null }> {
    const membership = await this.prisma.salonStaff.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: 'asc' },
      select: { salonId: true },
    });
    const salonId = membership?.salonId ?? '';
    const rows = await this.prisma.review.findMany({
      where: {
        salonId,
        ...(status ? { status } : { status: { not: 'removed' } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: reviewSelect,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map(toDto),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  /** Admin: list all reviews with optional status filter. */
  async adminList(
    cursor?: string,
    limit = 20,
    status?: ReviewStatus,
  ): Promise<{ items: ReviewDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.review.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: reviewSelect,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map(toDto),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  /** Admin: moderate a review (hide/restore/remove/under_review). */
  async adminModerate(reviewId: string, input: AdminModerateReviewInput): Promise<ReviewDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const rev = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: input.status,
          adminNote: input.adminNote ?? null,
        },
        select: reviewSelect,
      });
      await this.recomputeSalonRating(tx, rev.salonId);
      return rev;
    });

    this.emit('review:moderated', updated.salonId, updated.id);
    return toDto(updated);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async recomputeSalonRating(
    tx: Prisma.TransactionClient,
    salonId: string,
  ): Promise<void> {
    const agg = await tx.review.aggregate({
      where: { salonId, status: 'published' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.salon.update({
      where: { id: salonId },
      data: {
        averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewCount: agg._count._all,
      },
    });
  }

  private emit(type: ReviewEventType, salonId: string, entityId: string) {
    if (!this.io) return;
    const event = buildRealtimeEvent({ type, entityId, version: 0 });
    this.io.to(salonRoom(salonId)).emit('event', event);
  }
}
