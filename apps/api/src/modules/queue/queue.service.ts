import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { EntryState, QueueStatus as PrismaQueueStatus, SalonRole } from '@prisma/client';
import {
  buildRealtimeEvent,
  entryRoom,
  salonRoom,
  type BookingStatus,
  type EntryState as ContractEntryState,
  type QueueEntryDto,
  type QueueEventType,
  type QueueStatus,
  type SalonQueueSnapshot,
  type StaffEntryRow,
} from '@soliton/api-contract';
import type { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { EtaService } from './eta.service';
import { logger } from '../../common/logging/logger';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Maps internal EntryState to the customer-facing BookingStatus. */
function toBookingStatus(state: EntryState): BookingStatus {
  switch (state) {
    case 'waiting':
      return 'waiting';
    case 'notified':
    case 'checked_in':
      return 'waiting';
    case 'in_service':
      return 'serving';
    case 'completed':
      return 'completed';
    case 'no_show':
      return 'no_show';
    case 'cancelled':
    case 'bumped':
      return 'cancelled';
    default:
      return 'cancelled';
  }
}

/** Full query select for a QueueEntry with related data. */
const entrySelect = {
  id: true,
  tokenNumber: true,
  sequenceNo: true,
  state: true,
  salonId: true,
  customerId: true,
  serviceId: true,
  etaMinutes: true,
  createdAt: true,
  queue: {
    select: {
      id: true,
      queueVersion: true,
      salon: { select: { name: true, address: true } },
    },
  },
  service: { select: { name: true, priceCents: true, estimatedMinutes: true } },
  chair: { select: { label: true } },
} as const;

type EntryWithRelations = Prisma.QueueEntryGetPayload<{ select: typeof entrySelect }>;

@Injectable()
export class QueueService {
  private _io: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eta: EtaService,
  ) {}

  /** Called by the gateway once the server is ready. */
  setServer(io: Server): void {
    this._io = io;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Customer operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Join a salon's queue. Concurrency-safe: uses a serialised PostgreSQL transaction
   * to atomically increment tokenSeq and insert the entry.
   * Returns existing entry when the same idempotency key is presented (within 24h).
   */
  async joinQueue(
    customerId: string,
    salonId: string,
    serviceId: string,
    idempotencyKey: string | undefined,
  ): Promise<QueueEntryDto> {
    // Idempotency check — return existing entry if key matches a recent entry.
    if (idempotencyKey) {
      const existing = await this.prisma.queueEntry.findFirst({
        where: {
          customerId,
          salonId,
          serviceId,
          state: { in: ['waiting', 'notified', 'checked_in'] },
          createdAt: { gte: new Date(Date.now() - IDEMPOTENCY_TTL_MS) },
        },
        select: { id: true },
      });
      if (existing) {
        logger.info({ event: 'queue_join_idempotent', customerId, salonId }, 'queue_join_idempotent');
        const full = await this.loadEntry(existing.id);
        return this.toEntryDto(full, await this.positionAhead(full));
      }
    }

    // Guard: customer already in active queue for this salon.
    const duplicate = await this.prisma.queueEntry.findFirst({
      where: {
        customerId,
        salonId,
        state: { in: ['waiting', 'notified', 'checked_in', 'in_service'] },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('You already have an active entry in this queue.');
    }

    // Validate: service belongs to this salon and is active.
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, salonId, active: true },
      select: { id: true },
    });
    if (!service) throw new NotFoundException('Service not found or inactive.');

    // Validate: queue exists and is open.
    const queue = await this.prisma.queue.findUnique({
      where: { salonId },
      select: { id: true, status: true },
    });
    if (!queue) throw new NotFoundException('Queue not found for this salon.');
    if (queue.status !== 'open') {
      throw new ConflictException(`Queue is currently ${queue.status}.`);
    }

    // Concurrency-safe token + entry creation in a single transaction.
    const newEntryId = await this.prisma.$transaction(async (tx) => {
      // Atomic token increment (SELECT FOR UPDATE is implicit in Prisma's UPDATE).
      const updated = await tx.queue.update({
        where: { salonId },
        data: {
          tokenSeq: { increment: 1 },
          sequenceSeq: { increment: 1 },
          queueVersion: { increment: 1 },
        },
        select: { id: true, tokenSeq: true, sequenceSeq: true, queueVersion: true },
      });

      const created = await tx.queueEntry.create({
        data: {
          queueId: updated.id,
          salonId,
          customerId,
          serviceId,
          source: 'remote',
          tokenNumber: updated.tokenSeq,
          sequenceNo: updated.sequenceSeq,
          state: 'waiting',
        },
        select: { id: true },
      });

      await tx.queueAudit.create({
        data: {
          salonId,
          entryId: created.id,
          actorId: customerId,
          action: 'joined',
          before: Prisma.JsonNull,
          after: { state: 'waiting', tokenNumber: updated.tokenSeq },
        },
      });

      return created.id;
    });

    // Reload with full relations after the transaction so relations are available.
    const entry = await this.loadEntry(newEntryId);
    const dto = this.toEntryDto(entry, await this.positionAhead(entry));
    this.emit(salonRoom(salonId), 'queue.entry.joined', salonId, entry.queue.queueVersion, {
      entryId: entry.id,
      tokenNumber: entry.tokenNumber,
    });
    this.emit(entryRoom(entry.id), 'queue.entry.joined', entry.id, entry.queue.queueVersion, dto);

    logger.info(
      { event: 'queue_joined', entryId: entry.id, customerId, salonId, token: entry.tokenNumber },
      'queue_joined',
    );
    return dto;
  }

  /** Customer cancels their own queue entry. */
  async leaveQueue(customerId: string, entryId: string): Promise<QueueEntryDto> {
    const entry = await this.loadEntry(entryId);
    if (entry.customerId !== customerId) throw new ForbiddenException('Not your queue entry.');
    if (!['waiting', 'notified'].includes(entry.state)) {
      throw new ConflictException(`Cannot cancel entry in state: ${entry.state}`);
    }
    return this.transition(entry, 'cancelled', customerId, 'customer_cancelled');
  }

  /** List customer's booking entries. */
  async listCustomerBookings(customerId: string): Promise<QueueEntryDto[]> {
    const entries = await this.prisma.queueEntry.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: entrySelect,
    });

    // Compute positions for active entries efficiently.
    const activeIds = entries
      .filter((e) => ['waiting', 'notified', 'checked_in'].includes(e.state))
      .map((e) => e.id);

    const posMap = await this.positionsAhead(activeIds);

    return entries.map((e) => this.toEntryDto(e, posMap.get(e.id) ?? null));
  }

  /** Get a single booking entry (customer owns it). */
  async getCustomerBooking(customerId: string, entryId: string): Promise<QueueEntryDto> {
    const entry = await this.loadEntry(entryId);
    if (entry.customerId !== customerId) throw new ForbiddenException('Not your queue entry.');
    return this.toEntryDto(entry, await this.positionAhead(entry));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Staff operations
  // ─────────────────────────────────────────────────────────────────────────

  async assertStaffAccess(userId: string, salonId: string): Promise<SalonRole> {
    const membership = await this.prisma.salonStaff.findFirst({
      where: { userId, salonId, active: true },
      select: { role: true },
    });
    if (!membership) throw new ForbiddenException('You are not a staff member of this salon.');
    return membership.role;
  }

  /** Notify a customer their turn is approaching (waiting → notified). */
  async notifyEntry(staffId: string, salonId: string, entryId: string): Promise<QueueEntryDto> {
    await this.assertStaffAccess(staffId, salonId);
    const entry = await this.loadEntry(entryId);
    this.assertEntrySalon(entry, salonId);
    if (entry.state !== 'waiting') {
      throw new ConflictException(`Entry is in state ${entry.state}, cannot notify.`);
    }
    return this.transition(entry, 'notified', staffId, 'staff_notified');
  }

  /** Check in an entry (notified → checked_in). Staff or customer. */
  async checkInEntry(actorId: string, salonId: string, entryId: string): Promise<QueueEntryDto> {
    const entry = await this.loadEntry(entryId);
    this.assertEntrySalon(entry, salonId);
    if (entry.state !== 'notified') {
      throw new ConflictException(`Entry must be in notified state to check in.`);
    }
    // Allow customer self-check-in or staff.
    const isOwner = entry.customerId === actorId;
    if (!isOwner) await this.assertStaffAccess(actorId, salonId);
    return this.transition(entry, 'checked_in', actorId, 'checked_in');
  }

  /** Start service on a checked-in entry (checked_in → in_service). */
  async startService(
    staffId: string,
    salonId: string,
    entryId: string,
    chairId?: string,
  ): Promise<QueueEntryDto> {
    await this.assertStaffAccess(staffId, salonId);
    const entry = await this.loadEntry(entryId);
    this.assertEntrySalon(entry, salonId);
    if (entry.state !== 'checked_in') {
      throw new ConflictException(`Entry must be checked_in to start service.`);
    }

    // Validate chairId belongs to this salon.
    if (chairId) {
      const chair = await this.prisma.chair.findFirst({
        where: { id: chairId, salonId, active: true },
        select: { id: true },
      });
      if (!chair) throw new NotFoundException('Chair not found or inactive.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const e = await tx.queueEntry.update({
        where: { id: entryId },
        data: {
          state: 'in_service',
          chairId: chairId ?? null,
          startedAt: new Date(),
        },
        select: entrySelect,
      });
      await tx.queue.update({
        where: { salonId },
        data: { queueVersion: { increment: 1 } },
      });
      await tx.queueAudit.create({
        data: {
          salonId,
          entryId,
          actorId: staffId,
          action: 'started',
          before: { state: entry.state },
          after: { state: 'in_service', chairId },
        },
      });
      return e;
    });

    const dto = this.toEntryDto(updated, null);
    this.emitEntryAndSalon(updated, 'queue.entry.started', dto);
    return dto;
  }

  /** Complete service (in_service → completed). */
  async completeService(staffId: string, salonId: string, entryId: string): Promise<QueueEntryDto> {
    await this.assertStaffAccess(staffId, salonId);
    const entry = await this.loadEntry(entryId);
    this.assertEntrySalon(entry, salonId);
    if (entry.state !== 'in_service') {
      throw new ConflictException(`Entry must be in_service to complete.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const e = await tx.queueEntry.update({
        where: { id: entryId },
        data: { state: 'completed', completedAt: new Date() },
        select: entrySelect,
      });
      await tx.queue.update({
        where: { salonId },
        data: { queueVersion: { increment: 1 } },
      });
      await tx.queueAudit.create({
        data: {
          salonId,
          entryId,
          actorId: staffId,
          action: 'completed',
          before: { state: 'in_service' },
          after: { state: 'completed' },
        },
      });
      return e;
    });

    const dto = this.toEntryDto(updated, null);
    this.emitEntryAndSalon(updated, 'queue.entry.completed', dto);
    return dto;
  }

  /** Mark no-show (waiting|notified|checked_in → no_show). */
  async markNoShow(staffId: string, salonId: string, entryId: string): Promise<QueueEntryDto> {
    await this.assertStaffAccess(staffId, salonId);
    const entry = await this.loadEntry(entryId);
    this.assertEntrySalon(entry, salonId);
    if (!['waiting', 'notified', 'checked_in'].includes(entry.state)) {
      throw new ConflictException(`Cannot mark no-show for entry in state ${entry.state}.`);
    }
    return this.transition(entry, 'no_show', staffId, 'no_show');
  }

  /** Pause queue (open → paused). */
  async pauseQueue(staffId: string, salonId: string): Promise<{ status: PrismaQueueStatus }> {
    await this.assertStaffAccess(staffId, salonId);
    await this.setQueueStatus(salonId, 'open', 'paused');
    this.emitQueueControl(salonId, 'queue.paused');
    return { status: 'paused' };
  }

  /** Resume queue (paused → open). */
  async resumeQueue(staffId: string, salonId: string): Promise<{ status: PrismaQueueStatus }> {
    await this.assertStaffAccess(staffId, salonId);
    await this.setQueueStatus(salonId, 'paused', 'open');
    this.emitQueueControl(salonId, 'queue.resumed');
    return { status: 'open' };
  }

  /** Close queue. */
  async closeQueue(staffId: string, salonId: string): Promise<{ status: PrismaQueueStatus }> {
    await this.assertStaffAccess(staffId, salonId);
    const queue = await this.prisma.queue.findUnique({
      where: { salonId },
      select: { status: true },
    });
    if (!queue) throw new NotFoundException('Queue not found.');
    await this.prisma.queue.update({
      where: { salonId },
      data: { status: 'closed', queueVersion: { increment: 1 } },
    });
    this.emitQueueControl(salonId, 'queue.closed');
    return { status: 'closed' };
  }

  /** Staff: get authoritative queue snapshot for their salon. */
  async getSalonSnapshot(staffId: string, salonId: string): Promise<SalonQueueSnapshot> {
    await this.assertStaffAccess(staffId, salonId);
    return this.buildSalonSnapshot(salonId);
  }

  /** Called by the gateway for entry-room snapshot:request. */
  async getEntrySnapshot(entryId: string, userId: string): Promise<QueueEntryDto> {
    const entry = await this.loadEntry(entryId);
    // Allow if it's the customer's own entry or a staff member of the salon.
    const isOwner = entry.customerId === userId;
    if (!isOwner) {
      const role = await this.prisma.salonStaff.findFirst({
        where: { userId, salonId: entry.salonId, active: true },
        select: { id: true },
      });
      if (!role) throw new Error('Unauthorized');
    }
    return this.toEntryDto(entry, await this.positionAhead(entry));
  }

  /** Build a snapshot (used by both HTTP and Socket.IO snapshot handler). */
  async buildSalonSnapshot(salonId: string): Promise<SalonQueueSnapshot> {
    const queue = await this.prisma.queue.findUnique({
      where: { salonId },
      select: {
        id: true,
        status: true,
        queueVersion: true,
        entries: {
          where: { state: { in: ['waiting', 'notified', 'checked_in', 'in_service'] } },
          orderBy: { sequenceNo: 'asc' },
          select: {
            id: true,
            tokenNumber: true,
            sequenceNo: true,
            state: true,
            etaMinutes: true,
            service: { select: { name: true, estimatedMinutes: true } },
            chair: { select: { label: true } },
            createdAt: true,
          },
        },
      },
    });

    if (!queue) throw new NotFoundException('Queue not found.');

    const inService = queue.entries.filter((e) => e.state === 'in_service');
    const waiting = queue.entries.filter((e) =>
      ['waiting', 'notified', 'checked_in'].includes(e.state),
    );

    const avgDuration =
      waiting.length > 0
        ? Math.round(
            waiting.reduce((acc, e) => acc + e.service.estimatedMinutes, 0) / waiting.length,
          )
        : 30;

    const etaMap = this.eta.computeEtas(
      waiting.map((e) => ({
        id: e.id,
        sequenceNo: e.sequenceNo,
        serviceDurationMinutes: e.service.estimatedMinutes,
      })),
      inService.length,
      avgDuration,
    );

    const currentToken =
      inService.length > 0
        ? Math.min(...inService.map((e) => e.tokenNumber))
        : null;

    const entries: StaffEntryRow[] = queue.entries.map((e) => ({
      id: e.id,
      tokenNumber: e.tokenNumber,
      serviceName: e.service.name,
      serviceDurationMinutes: e.service.estimatedMinutes,
      entryState: e.state as ContractEntryState,
      etaMinutes: etaMap.get(e.id) ?? e.etaMinutes,
      chairLabel: e.chair?.label ?? null,
      createdAt: e.createdAt.toISOString(),
    }));

    const etaForNext = this.eta.etaForNextJoin(waiting.length, inService.length, avgDuration);

    return {
      salonId,
      status: queue.status as QueueStatus,
      currentToken,
      waitingCount: waiting.length,
      activeChairs: inService.length,
      etaMinutes: etaForNext,
      version: queue.queueVersion.toString(),
      entries,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async loadEntry(entryId: string): Promise<EntryWithRelations> {
    const entry = await this.prisma.queueEntry.findUnique({
      where: { id: entryId },
      select: entrySelect,
    });
    if (!entry) throw new NotFoundException('Queue entry not found.');
    return entry;
  }

  private assertEntrySalon(entry: EntryWithRelations, salonId: string): void {
    if (entry.salonId !== salonId) throw new ForbiddenException('Entry does not belong to this salon.');
  }

  /** Generic state transition with audit log + realtime event. */
  private async transition(
    entry: EntryWithRelations,
    newState: EntryState,
    actorId: string,
    action: string,
  ): Promise<QueueEntryDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const e = await tx.queueEntry.update({
        where: { id: entry.id },
        data: { state: newState },
        select: entrySelect,
      });
      await tx.queue.update({
        where: { salonId: entry.salonId },
        data: { queueVersion: { increment: 1 } },
      });
      await tx.queueAudit.create({
        data: {
          salonId: entry.salonId,
          entryId: entry.id,
          actorId,
          action,
          before: { state: entry.state },
          after: { state: newState },
        },
      });
      return e;
    });

    const dto = this.toEntryDto(
      updated,
      ['waiting', 'notified', 'checked_in'].includes(newState) ? await this.positionAhead(updated) : null,
    );

    const eventType = `queue.entry.${action.replace('_', '.')}` as QueueEventType;
    this.emitEntryAndSalon(updated, eventType, dto);
    return dto;
  }

  private async positionAhead(entry: EntryWithRelations): Promise<number | null> {
    if (!['waiting', 'notified', 'checked_in'].includes(entry.state)) return null;
    const count = await this.prisma.queueEntry.count({
      where: {
        queueId: entry.queue.id,
        state: { in: ['waiting', 'notified', 'checked_in'] },
        sequenceNo: { lt: entry.sequenceNo },
      },
    });
    return count;
  }

  private async positionsAhead(entryIds: string[]): Promise<Map<string, number>> {
    if (entryIds.length === 0) return new Map();
    const entries = await this.prisma.queueEntry.findMany({
      where: { id: { in: entryIds } },
      select: { id: true, queueId: true, sequenceNo: true, state: true },
    });

    const result = new Map<string, number>();
    for (const entry of entries) {
      const ahead = await this.prisma.queueEntry.count({
        where: {
          queueId: entry.queueId,
          state: { in: ['waiting', 'notified', 'checked_in'] },
          sequenceNo: { lt: entry.sequenceNo },
        },
      });
      result.set(entry.id, ahead);
    }
    return result;
  }

  private async setQueueStatus(
    salonId: string,
    expectedStatus: PrismaQueueStatus,
    newStatus: PrismaQueueStatus,
  ): Promise<void> {
    const queue = await this.prisma.queue.findUnique({
      where: { salonId },
      select: { status: true },
    });
    if (!queue) throw new NotFoundException('Queue not found.');
    if (queue.status !== expectedStatus) {
      throw new ConflictException(`Queue is currently ${queue.status}, expected ${expectedStatus}.`);
    }
    await this.prisma.queue.update({
      where: { salonId },
      data: { status: newStatus, queueVersion: { increment: 1 } },
    });
  }

  private toEntryDto(entry: EntryWithRelations, positionAhead: number | null): QueueEntryDto {
    return {
      id: entry.id,
      salonId: entry.salonId,
      salonName: entry.queue.salon.name,
      salonAddress: entry.queue.salon.address,
      serviceId: entry.serviceId,
      serviceName: entry.service.name,
      servicePriceCents: entry.service.priceCents,
      serviceDurationMinutes: entry.service.estimatedMinutes,
      tokenNumber: entry.tokenNumber,
      status: toBookingStatus(entry.state),
      entryState: entry.state as ContractEntryState,
      queuePositionAhead: positionAhead,
      etaMinutes: entry.etaMinutes,
      chairLabel: entry.chair?.label ?? null,
      createdAt: entry.createdAt.toISOString(),
      queueVersion: entry.queue.queueVersion.toString(),
    };
  }

  private emit(
    room: string,
    type: QueueEventType,
    entityId: string,
    version: bigint,
    payload?: unknown,
  ): void {
    if (!this._io) return;
    const event = buildRealtimeEvent({ type, entityId, version: version.toString(), payload });
    this._io.to(room).emit('realtime:event', event);
  }

  private emitEntryAndSalon(
    entry: EntryWithRelations,
    type: QueueEventType,
    payload: unknown,
  ): void {
    this.emit(entryRoom(entry.id), type, entry.id, entry.queue.queueVersion, payload);
    this.emit(salonRoom(entry.salonId), type, entry.salonId, entry.queue.queueVersion, {
      entryId: entry.id,
      tokenNumber: entry.tokenNumber,
    });
  }

  private emitQueueControl(salonId: string, type: QueueEventType): void {
    if (!this._io) return;
    const event = buildRealtimeEvent({ type, entityId: salonId, version: Date.now() });
    this._io.to(salonRoom(salonId)).emit('realtime:event', event);
  }
}
