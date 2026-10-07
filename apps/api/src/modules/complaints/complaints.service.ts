import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildRealtimeEvent,
  salonRoom,
  type AdminUpdateComplaintInput,
  type ComplaintCategory,
  type ComplaintDto,
  type ComplaintStatus,
  type CreateComplaintInput,
} from '@soliton/api-contract';
import type { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/logging/logger';

const complaintSelect = {
  id: true,
  reporterId: true,
  salonId: true,
  appointmentId: true,
  entryId: true,
  reviewId: true,
  category: true,
  status: true,
  body: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
  salon: { select: { name: true } },
} as const;

type ComplaintWithRelations = Prisma.ComplaintGetPayload<{ select: typeof complaintSelect }>;

function toDto(c: ComplaintWithRelations): ComplaintDto {
  return {
    id: c.id,
    reporterId: c.reporterId,
    salonId: c.salonId,
    salonName: c.salon?.name ?? null,
    appointmentId: c.appointmentId,
    entryId: c.entryId,
    reviewId: c.reviewId,
    category: c.category as ComplaintCategory,
    status: c.status as ComplaintStatus,
    body: c.body,
    adminNote: c.adminNote,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

@Injectable()
export class ComplaintsService {
  private io: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  setIo(io: Server) {
    this.io = io;
  }

  async create(reporterId: string, input: CreateComplaintInput): Promise<ComplaintDto> {
    // Validate appointment ownership if provided
    if (input.appointmentId) {
      const appt = await this.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        select: { customerId: true, salonId: true },
      });
      if (!appt) throw new NotFoundException('Appointment not found');
      if (appt.customerId !== reporterId) throw new ForbiddenException('Not your appointment');
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        reporterId,
        salonId: input.salonId ?? null,
        appointmentId: input.appointmentId ?? null,
        entryId: input.entryId ?? null,
        reviewId: input.reviewId ?? null,
        category: input.category,
        body: input.body,
        status: 'open',
      },
      select: complaintSelect,
    });

    if (complaint.salonId) {
      this.io?.to(salonRoom(complaint.salonId)).emit(
        'event',
        buildRealtimeEvent({ type: 'complaint:created', entityId: complaint.id, version: 0 }),
      );
    }

    logger.info({ complaintId: complaint.id, reporterId }, 'complaint created');
    return toDto(complaint);
  }

  async listMine(
    reporterId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ComplaintDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.complaint.findMany({
      where: { reporterId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: complaintSelect,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items: items.map(toDto), nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async getOne(reporterId: string, complaintId: string): Promise<ComplaintDto> {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      select: complaintSelect,
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.reporterId !== reporterId) throw new ForbiddenException('Access denied');
    return toDto(complaint);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async adminList(
    cursor?: string,
    limit = 20,
    status?: ComplaintStatus,
  ): Promise<{ items: ComplaintDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.complaint.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: complaintSelect,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items: items.map(toDto), nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async adminUpdate(
    complaintId: string,
    input: AdminUpdateComplaintInput,
  ): Promise<ComplaintDto> {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: input.status,
        adminNote: input.adminNote ?? null,
      },
      select: complaintSelect,
    });

    if (updated.reporterId) {
      const notifType = input.status === 'resolved'
        ? 'APPOINTMENT_COMPLETED'
        : 'APPOINTMENT_COMPLETED';
      this.notifications.send(updated.reporterId, notifType, {
        message: input.status === 'resolved'
          ? 'Your complaint has been resolved.'
          : 'Your complaint status has been updated.',
      }).catch(() => {});
    }

    if (updated.salonId) {
      this.io?.to(salonRoom(updated.salonId)).emit(
        'event',
        buildRealtimeEvent({ type: 'complaint:updated', entityId: updated.id, version: 0 }),
      );
    }

    return toDto(updated);
  }
}
