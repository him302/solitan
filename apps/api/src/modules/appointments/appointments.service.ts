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
  entryRoom,
  salonRoom,
  type AppointmentDto,
  type AppointmentEventType,
  type AppointmentStatus,
  type AppointmentSummaryDto,
  type AvailabilitySlot,
  type CreateAppointmentInput,
} from '@soliton/api-contract';
import type { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/logging/logger';
import { generateSlots } from './slot-generator';

/** Grace period after scheduledAt before auto no-show (minutes). */
const GRACE_MINUTES = 15;
/** How many days ahead availability can be queried. */
const MAX_AVAILABILITY_DAYS = 30;

const appointmentSelect = {
  id: true,
  salonId: true,
  customerId: true,
  serviceId: true,
  staffId: true,
  scheduledAt: true,
  durationMinutes: true,
  status: true,
  notes: true,
  arrivalNotifiedAt: true,
  graceExpiresAt: true,
  linkedEntryId: true,
  createdAt: true,
  salon: { select: { name: true, address: true, city: true } },
  service: { select: { name: true, priceCents: true, estimatedMinutes: true } },
  customer: { select: { travelBufferMin: true } },
} as const;

type ApptWithRelations = Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>;

function toDto(appt: ApptWithRelations): AppointmentDto {
  const effectiveDuration = appt.durationMinutes ?? appt.service.estimatedMinutes;
  const travelBufferMin = appt.customer.travelBufferMin;
  const scheduledAtMs = appt.scheduledAt.getTime();
  const recommendedArrivalAt = new Date(scheduledAtMs - travelBufferMin * 60_000).toISOString();

  return {
    id: appt.id,
    salonId: appt.salonId,
    salonName: appt.salon.name,
    salonAddress: appt.salon.address,
    salonCity: appt.salon.city,
    serviceId: appt.serviceId,
    serviceName: appt.service.name,
    servicePriceCents: appt.service.priceCents,
    serviceDurationMinutes: appt.service.estimatedMinutes,
    staffId: appt.staffId,
    scheduledAt: appt.scheduledAt.toISOString(),
    durationMinutes: effectiveDuration,
    status: appt.status as AppointmentStatus,
    notes: appt.notes,
    arrivalNotifiedAt: appt.arrivalNotifiedAt?.toISOString() ?? null,
    graceExpiresAt: appt.graceExpiresAt?.toISOString() ?? null,
    linkedEntryId: appt.linkedEntryId,
    recommendedArrivalAt,
    travelBufferMin,
    createdAt: appt.createdAt.toISOString(),
  };
}

function toSummaryDto(appt: ApptWithRelations): AppointmentSummaryDto {
  return {
    id: appt.id,
    salonId: appt.salonId,
    salonName: appt.salon.name,
    serviceId: appt.serviceId,
    serviceName: appt.service.name,
    scheduledAt: appt.scheduledAt.toISOString(),
    durationMinutes: appt.durationMinutes ?? appt.service.estimatedMinutes,
    status: appt.status as AppointmentStatus,
    linkedEntryId: appt.linkedEntryId,
  };
}

@Injectable()
export class AppointmentsService {
  private _io: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  setSocketServer(io: Server) {
    this._io = io;
  }

  // ─── Availability ───────────────────────────────────────────────────────────

  async getAvailability(salonId: string, serviceId: string, date: string): Promise<AvailabilitySlot[]> {
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) return [];

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_AVAILABILITY_DAYS);
    if (date > maxDate.toISOString().slice(0, 10)) {
      throw new BadRequestException(`Cannot query availability more than ${MAX_AVAILABILITY_DAYS} days ahead`);
    }

    const [service, hours, chairs, existingAppointments] = await Promise.all([
      this.prisma.service.findFirst({ where: { id: serviceId, salonId, active: true } }),
      this.prisma.operatingHours.findFirst({
        where: { salonId, weekday: new Date(date).getUTCDay() },
      }),
      this.prisma.chair.count({ where: { salonId, active: true } }),
      this.prisma.appointment.findMany({
        where: {
          salonId,
          scheduledAt: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lt: new Date(`${date}T23:59:59.999Z`),
          },
          status: { in: ['scheduled', 'confirmed', 'checked_in', 'in_service'] },
        },
        select: { scheduledAt: true, durationMinutes: true, service: { select: { estimatedMinutes: true } } },
      }),
    ]);

    if (!service) throw new NotFoundException('Service not found');
    if (!hours) return []; // salon closed on this weekday
    if (chairs === 0) return [];

    return generateSlots({
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      serviceDurationMinutes: service.estimatedMinutes,
      activeChairs: chairs,
      date,
      existingAppointments: existingAppointments.map((a) => ({
        scheduledAt: a.scheduledAt,
        durationMinutes: a.durationMinutes ?? a.service.estimatedMinutes,
      })),
      now: new Date(),
    });
  }

  // ─── Customer: list own appointments ────────────────────────────────────────

  async listForCustomer(customerId: string): Promise<AppointmentSummaryDto[]> {
    const appts = await this.prisma.appointment.findMany({
      where: { customerId },
      orderBy: { scheduledAt: 'desc' },
      select: appointmentSelect,
      take: 100,
    });
    return appts.map(toSummaryDto);
  }

  // ─── Get single appointment ─────────────────────────────────────────────────

  async getOne(id: string, requesterId: string, requesterRole: string): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: appointmentSelect,
    });
    if (!appt) throw new NotFoundException('Appointment not found');

    const isOwner = appt.customerId === requesterId;
    const isSalonStaff = requesterRole === 'staff' || requesterRole === 'owner' || requesterRole === 'admin';

    if (!isOwner && !isSalonStaff) {
      const staffLink = await this.prisma.salonStaff.findFirst({
        where: { salonId: appt.salonId, userId: requesterId, active: true },
      });
      if (!staffLink) throw new ForbiddenException('Access denied');
    }

    return toDto(appt as ApptWithRelations);
  }

  // ─── Customer: create appointment ───────────────────────────────────────────

  async create(customerId: string, input: CreateAppointmentInput): Promise<AppointmentDto> {
    const { salonId, serviceId, scheduledAt, notes, idempotencyKey } = input;

    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.appointment.findUnique({
        where: { idempotencyKey },
        select: appointmentSelect,
      });
      if (existing) return toDto(existing as ApptWithRelations);
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }

    const [service, hours, chairs] = await Promise.all([
      this.prisma.service.findFirst({ where: { id: serviceId, salonId, active: true } }),
      this.prisma.operatingHours.findFirst({
        where: { salonId, weekday: scheduledDate.getUTCDay() },
      }),
      this.prisma.chair.count({ where: { salonId, active: true } }),
    ]);

    if (!service) throw new NotFoundException('Service not found for this salon');
    if (!hours) throw new BadRequestException('Salon is closed on this day');
    if (chairs === 0) throw new BadRequestException('Salon has no active chairs');

    // Capacity check with advisory lock (serializable transaction)
    const appt = await this.prisma.$transaction(
      async (tx) => {
        const dateStr = scheduledDate.toISOString().slice(0, 10);
        const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
        const duration = service.estimatedMinutes;
        const slotEnd = new Date(scheduledDate.getTime() + duration * 60_000);

        const overlapping = await tx.appointment.count({
          where: {
            salonId,
            status: { in: ['scheduled', 'confirmed', 'checked_in', 'in_service'] },
            scheduledAt: { gte: dayStart, lt: dayEnd },
          },
        });

        if (overlapping >= chairs) {
          throw new ConflictException('No available slots at this time — please pick another');
        }

        // Double-check the specific slot is not fully booked
        const slotConflicts = await tx.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM appointments
          WHERE salon_id = ${salonId}::uuid
            AND status IN ('scheduled','confirmed','checked_in','in_service')
            AND scheduled_at < ${slotEnd}
            AND scheduled_at + (COALESCE(duration_minutes, ${duration}) * interval '1 minute') > ${scheduledDate}
        `;
        const conflictCount = Number(slotConflicts[0]?.count ?? 0);
        if (conflictCount >= chairs) {
          throw new ConflictException('No available slots at this time — please pick another');
        }

        return tx.appointment.create({
          data: {
            salonId,
            customerId,
            serviceId,
            scheduledAt: scheduledDate,
            status: 'scheduled',
            notes: notes ?? null,
            idempotencyKey: idempotencyKey ?? null,
            graceExpiresAt: new Date(scheduledDate.getTime() + GRACE_MINUTES * 60_000),
          },
          select: appointmentSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.emit(salonId, 'appointment.created', appt.id, { appointmentId: appt.id, customerId });

    await this.notifications.send(customerId, 'APPOINTMENT_BOOKED', {
      appointmentId: appt.id,
      salonName: appt.salon.name,
      serviceName: appt.service.name,
      scheduledAt: appt.scheduledAt.toISOString(),
    });

    return toDto(appt as ApptWithRelations);
  }

  // ─── Customer: cancel ───────────────────────────────────────────────────────

  async cancel(id: string, customerId: string): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: { ...appointmentSelect, customerId: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.customerId !== customerId) throw new ForbiddenException('Not your appointment');
    if (!['scheduled', 'confirmed'].includes(appt.status)) {
      throw new BadRequestException(`Cannot cancel an appointment in status: ${appt.status}`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
      select: appointmentSelect,
    });

    this.emit(appt.salonId, 'appointment.cancelled', id, { appointmentId: id });
    await this.notifications.send(customerId, 'APPOINTMENT_CANCELLED', {
      appointmentId: id,
      salonName: appt.salon.name,
      serviceName: appt.service.name,
      scheduledAt: appt.scheduledAt.toISOString(),
    });

    return toDto(updated as ApptWithRelations);
  }

  // ─── Customer: I'm On My Way ─────────────────────────────────────────────────

  async onWay(id: string, customerId: string): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: appointmentSelect,
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.customerId !== customerId) throw new ForbiddenException('Not your appointment');
    if (!['scheduled', 'confirmed'].includes(appt.status)) {
      throw new BadRequestException(`Cannot mark on-way for status: ${appt.status}`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { arrivalNotifiedAt: new Date(), status: 'confirmed' },
      select: appointmentSelect,
    });

    this.emit(appt.salonId, 'appointment.customer_on_way', id, {
      appointmentId: id,
      customerId,
      scheduledAt: appt.scheduledAt.toISOString(),
    });

    return toDto(updated as ApptWithRelations);
  }

  // ─── Customer: check in → queue ─────────────────────────────────────────────

  async checkIn(id: string, customerId: string): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: appointmentSelect,
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.customerId !== customerId) throw new ForbiddenException('Not your appointment');
    if (!['scheduled', 'confirmed'].includes(appt.status)) {
      throw new BadRequestException(`Cannot check in for status: ${appt.status}`);
    }

    // Get or open the salon queue
    const queue = await this.prisma.queue.findUnique({
      where: { salonId: appt.salonId },
      select: { id: true, status: true },
    });
    if (!queue) throw new BadRequestException('Salon queue is not set up yet');
    if (queue.status === 'closed') throw new BadRequestException('Queue is currently closed');

    // Atomic token assignment + appointment transition in one transaction
    const { updatedAppt } = await this.prisma.$transaction(async (tx) => {
      const updatedQueue = await tx.queue.update({
        where: { salonId: appt.salonId },
        data: {
          tokenSeq: { increment: 1 },
          sequenceSeq: { increment: 1 },
          queueVersion: { increment: 1 },
        },
        select: { id: true, tokenSeq: true, sequenceSeq: true },
      });

      const entry = await tx.queueEntry.create({
        data: {
          salonId: appt.salonId,
          queueId: updatedQueue.id,
          customerId,
          serviceId: appt.serviceId,
          source: 'appointment',
          tokenNumber: updatedQueue.tokenSeq,
          sequenceNo: updatedQueue.sequenceSeq,
          state: 'waiting',
          scheduledAt: appt.scheduledAt,
        },
        select: { id: true },
      });

      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'checked_in', linkedEntryId: entry.id },
        select: appointmentSelect,
      });

      return { updatedAppt: updated };
    });

    const finalAppt = updatedAppt;

    this.emit(appt.salonId, 'appointment.checked_in', id, { appointmentId: id, customerId });
    await this.notifications.send(customerId, 'APPOINTMENT_CHECKED_IN', {
      appointmentId: id,
      salonName: appt.salon.name,
    });

    return toDto(finalAppt as ApptWithRelations);
  }

  // ─── Salon staff: list salon appointments ────────────────────────────────────

  async listForSalon(
    salonId: string,
    staffUserId: string,
    date?: string,
    status?: string,
  ): Promise<AppointmentSummaryDto[]> {
    await this.assertSalonAccess(salonId, staffUserId);

    const where: Prisma.AppointmentWhereInput = { salonId };
    if (date) {
      where.scheduledAt = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lt: new Date(`${date}T23:59:59.999Z`),
      };
    }
    if (status && status !== 'all') {
      where.status = status as any;
    }

    const appts = await this.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      select: appointmentSelect,
      take: 200,
    });
    return appts.map(toSummaryDto);
  }

  // ─── Salon staff: no-show ────────────────────────────────────────────────────

  async markNoShow(id: string, staffUserId: string): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, select: appointmentSelect });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertSalonAccess(appt.salonId, staffUserId);

    if (!['scheduled', 'confirmed'].includes(appt.status)) {
      throw new BadRequestException(`Cannot mark no-show for status: ${appt.status}`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'no_show' },
      select: appointmentSelect,
    });

    this.emit(appt.salonId, 'appointment.no_show', id, { appointmentId: id });
    await this.notifications.send(appt.customerId, 'APPOINTMENT_NO_SHOW', {
      appointmentId: id,
      salonName: appt.salon.name,
    });

    return toDto(updated as ApptWithRelations);
  }

  // ─── Salon staff: start service ──────────────────────────────────────────────

  async startService(id: string, staffUserId: string): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, select: appointmentSelect });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertSalonAccess(appt.salonId, staffUserId);

    if (appt.status !== 'checked_in') {
      throw new BadRequestException(`Cannot start service for status: ${appt.status}`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'in_service' },
      select: appointmentSelect,
    });

    return toDto(updated as ApptWithRelations);
  }

  // ─── Salon staff: complete ───────────────────────────────────────────────────

  async complete(id: string, staffUserId: string): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, select: appointmentSelect });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertSalonAccess(appt.salonId, staffUserId);

    if (appt.status !== 'in_service') {
      throw new BadRequestException(`Cannot complete appointment in status: ${appt.status}`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'completed' },
      select: appointmentSelect,
    });

    this.emit(appt.salonId, 'appointment.completed', id, { appointmentId: id });
    await this.notifications.send(appt.customerId, 'APPOINTMENT_COMPLETED', {
      appointmentId: id,
      salonName: appt.salon.name,
    });

    return toDto(updated as ApptWithRelations);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async assertSalonAccess(salonId: string, userId: string): Promise<void> {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId }, select: { ownerId: true } });
    if (!salon) throw new NotFoundException('Salon not found');
    if (salon.ownerId === userId) return;

    const staffLink = await this.prisma.salonStaff.findFirst({
      where: { salonId, userId, active: true },
    });
    if (!staffLink) throw new ForbiddenException('Access denied to this salon');
  }

  private emit(salonId: string, eventType: AppointmentEventType, entityId: string, payload: unknown): void {
    if (!this._io) return;
    try {
      const event = buildRealtimeEvent({ type: eventType, entityId, version: Date.now(), payload });
      this._io.to(salonRoom(salonId)).emit('event', event);
      if (entityId !== salonId) {
        this._io.to(entryRoom(entityId)).emit('event', event);
      }
      logger.debug({ eventType, salonId, entityId }, 'appointment event emitted');
    } catch (err) {
      logger.warn({ err, eventType }, 'realtime emit failed (non-fatal)');
    }
  }
}
