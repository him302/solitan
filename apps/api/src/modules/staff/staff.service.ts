import { Injectable } from '@nestjs/common';
import { Prisma, type SalonRole } from '@prisma/client';
import type {
  AddStaffInput,
  PublicStaffDto,
  SetStaffServicesInput,
  StaffListDto,
  StaffMemberDto,
  StaffWorkloadDto,
  UpdateStaffInput,
} from '@soliton/api-contract';
import { SALON_TIMEZONE } from '@soliton/api-contract';
import {
  staffAlreadyMember,
  staffLastOwner,
  staffNotFound,
  staffServiceMismatch,
} from '../../common/errors/domain.exception';
import { logger } from '../../common/logging/logger';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SalonAccessService } from '../salons/salon-access.service';

/** Shape loaded for owner-facing responses. */
const staffInclude = {
  user: { select: { id: true, name: true, phone: true } },
  capabilities: {
    include: { service: { select: { id: true, name: true, estimatedMinutes: true } } },
  },
} satisfies Prisma.SalonStaffInclude;

type StaffRecord = Prisma.SalonStaffGetPayload<{ include: typeof staffInclude }>;

/**
 * Staff management (Part 8).
 *
 * The SalonStaff and StaffService tables existed before this module but had no write
 * path at all: the only `salonStaff.create` in the codebase was the one that gives a new
 * salon's owner their own membership row. Owners therefore could not add anybody.
 *
 * Every write is owner-only, enforced server-side via SalonAccessService.assertManager
 * against the database — a salonId from the client is only ever a lookup key.
 */
@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SalonAccessService,
  ) {}

  /** Public: who works here. Name and id only — never phone numbers or workload. */
  async listPublic(salonId: string): Promise<PublicStaffDto[]> {
    const members = await this.prisma.salonStaff.findMany({
      where: { salonId, active: true },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({ id: m.id, name: m.user.name ?? 'Staff' }));
  }

  /** Owner: the full roster, with capabilities and live workload. */
  async list(user: RequestUser, salonId: string): Promise<StaffListDto> {
    await this.access.assertManager(user, salonId);

    const members = await this.prisma.salonStaff.findMany({
      where: { salonId },
      include: staffInclude,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    const workloads = await this.loadWorkloads(
      salonId,
      members.map((m) => m.id),
    );

    return {
      items: members.map((m) => this.toDto(m, workloads.get(m.id))),
      onShiftCount: members.filter((m) => m.active && m.onShift).length,
    };
  }

  async get(user: RequestUser, salonId: string, staffId: string): Promise<StaffMemberDto> {
    await this.access.assertManager(user, salonId);
    const member = await this.prisma.salonStaff.findFirst({
      where: { id: staffId, salonId },
      include: staffInclude,
    });
    if (!member) throw staffNotFound();
    const workloads = await this.loadWorkloads(salonId, [member.id]);
    return this.toDto(member, workloads.get(member.id));
  }

  /**
   * Adds a staff member by phone number.
   *
   * Phone rather than email because the zero-cost policy rules out an email service, and
   * phone is already how everyone signs in (OTP). If the phone has no account yet a
   * `staff`-role user is created, so the member can sign in immediately without an
   * invitation anyone would have to deliver.
   *
   * An existing account is linked as-is and its global `User.role` is deliberately left
   * alone: salon permissions come from this SalonStaff row, so a customer who also cuts
   * hair keeps their customer account intact.
   */
  async add(user: RequestUser, salonId: string, input: AddStaffInput): Promise<StaffMemberDto> {
    await this.access.assertManager(user, salonId);

    const phone = normalizePhone(input.phone);

    // Capability ids are validated before anything is written, so a bad service id
    // cannot leave a half-added member behind.
    const serviceIds = await this.assertServicesBelongToSalon(salonId, input.serviceIds ?? []);

    const created = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { phone }, select: { id: true } });

      const account =
        existing ??
        (await tx.user.create({
          data: { phone, name: input.name ?? null, role: 'staff' },
          select: { id: true },
        }));

      // A member may already exist but be deactivated; reactivate rather than refusing,
      // which is what an owner re-hiring someone actually means.
      const prior = await tx.salonStaff.findUnique({
        where: { salonId_userId: { salonId, userId: account.id } },
        select: { id: true, active: true },
      });

      if (prior?.active) throw staffAlreadyMember();

      const member = prior
        ? await tx.salonStaff.update({
            where: { id: prior.id },
            data: { active: true, role: input.role },
          })
        : await tx.salonStaff.create({
            data: { salonId, userId: account.id, role: input.role, active: true, onShift: false },
          });

      // Only fill in a name when the account has none, so adding an existing user does
      // not let one salon rename a person for every other context.
      if (input.name && !existing) {
        await tx.user.update({ where: { id: account.id }, data: { name: input.name } });
      }

      await this.replaceCapabilities(tx, salonId, member.id, serviceIds);

      return member.id;
    });

    logger.info(
      { event: 'staff_added', salonId, staffId: created, actorId: user.id, role: input.role },
      'staff_added',
    );

    return this.get(user, salonId, created);
  }

  /** Owner: change role, employment status, availability, or the person's name. */
  async update(
    user: RequestUser,
    salonId: string,
    staffId: string,
    input: UpdateStaffInput,
  ): Promise<StaffMemberDto> {
    await this.access.assertManager(user, salonId);

    const member = await this.prisma.salonStaff.findFirst({
      where: { id: staffId, salonId },
      select: { id: true, userId: true, role: true, active: true },
    });
    if (!member) throw staffNotFound();

    const losesOwnership =
      (input.role !== undefined && input.role !== 'owner' && member.role === 'owner') ||
      (input.active === false && member.role === 'owner');
    if (losesOwnership) await this.assertNotLastOwner(salonId, member.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.salonStaff.update({
        where: { id: member.id },
        data: {
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
          // Leaving the roster also ends the shift; otherwise a deactivated member would
          // keep counting towards capacity in the ETA engine.
          ...(input.onShift !== undefined ? { onShift: input.onShift } : {}),
          ...(input.active === false ? { onShift: false } : {}),
        },
      });
      if (input.name !== undefined) {
        await tx.user.update({ where: { id: member.userId }, data: { name: input.name } });
      }
    });

    logger.info(
      { event: 'staff_updated', salonId, staffId, actorId: user.id, changes: Object.keys(input) },
      'staff_updated',
    );

    return this.get(user, salonId, staffId);
  }

  /**
   * Owner: remove a member. Deactivation rather than deletion, because QueueEntry.staffId
   * and QueueAudit rows reference this membership — deleting it would orphan served
   * history and break the analytics that Part 9 reports on.
   */
  async remove(user: RequestUser, salonId: string, staffId: string): Promise<StaffMemberDto> {
    await this.access.assertManager(user, salonId);

    const member = await this.prisma.salonStaff.findFirst({
      where: { id: staffId, salonId },
      select: { id: true, role: true },
    });
    if (!member) throw staffNotFound();
    if (member.role === 'owner') await this.assertNotLastOwner(salonId, member.id);

    await this.prisma.salonStaff.update({
      where: { id: member.id },
      data: { active: false, onShift: false },
    });

    logger.info({ event: 'staff_removed', salonId, staffId, actorId: user.id }, 'staff_removed');
    return this.get(user, salonId, staffId);
  }

  /** Owner: replace which services this member can perform. */
  async setServices(
    user: RequestUser,
    salonId: string,
    staffId: string,
    input: SetStaffServicesInput,
  ): Promise<StaffMemberDto> {
    await this.access.assertManager(user, salonId);

    const member = await this.prisma.salonStaff.findFirst({
      where: { id: staffId, salonId },
      select: { id: true },
    });
    if (!member) throw staffNotFound();

    const serviceIds = await this.assertServicesBelongToSalon(salonId, input.serviceIds);

    await this.prisma.$transaction((tx) =>
      this.replaceCapabilities(tx, salonId, member.id, serviceIds),
    );

    return this.get(user, salonId, staffId);
  }

  /**
   * A staff member setting their own availability. Scoped to their own membership rather
   * than taking a staffId, so one member can never clock another in or out.
   */
  async setOwnShift(user: RequestUser, onShift: boolean): Promise<StaffMemberDto> {
    const membership = await this.prisma.salonStaff.findFirst({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, salonId: true },
    });
    if (!membership) throw staffNotFound();

    await this.prisma.salonStaff.update({
      where: { id: membership.id },
      data: { onShift },
    });

    logger.info(
      { event: 'staff_shift_changed', salonId: membership.salonId, userId: user.id, onShift },
      'staff_shift_changed',
    );

    const member = await this.prisma.salonStaff.findFirst({
      where: { id: membership.id },
      include: staffInclude,
    });
    if (!member) throw staffNotFound();
    const workloads = await this.loadWorkloads(membership.salonId, [membership.id]);
    return this.toDto(member, workloads.get(membership.id));
  }

  // ── internals ────────────────────────────────────────────────────────────

  /**
   * Rejects service ids from another salon. StaffService has a composite FK on
   * (serviceId, salonId) so the database would refuse anyway, but failing here turns a
   * raw constraint violation into a specific, actionable error.
   */
  private async assertServicesBelongToSalon(
    salonId: string,
    serviceIds: string[],
  ): Promise<string[]> {
    const unique = [...new Set(serviceIds)];
    if (unique.length === 0) return [];

    const found = await this.prisma.service.findMany({
      where: { id: { in: unique }, salonId },
      select: { id: true },
    });
    if (found.length !== unique.length) throw staffServiceMismatch();
    return unique;
  }

  private async replaceCapabilities(
    tx: Prisma.TransactionClient,
    salonId: string,
    salonStaffId: string,
    serviceIds: string[],
  ): Promise<void> {
    await tx.staffService.deleteMany({ where: { salonStaffId } });
    if (serviceIds.length === 0) return;
    await tx.staffService.createMany({
      data: serviceIds.map((serviceId) => ({ salonStaffId, serviceId, salonId })),
      skipDuplicates: true,
    });
  }

  /** INV-OWNER: at least one active owner must remain, or the salon becomes unmanageable. */
  private async assertNotLastOwner(salonId: string, excludingStaffId: string): Promise<void> {
    const otherOwners = await this.prisma.salonStaff.count({
      where: { salonId, role: 'owner', active: true, id: { not: excludingStaffId } },
    });
    if (otherOwners === 0) throw staffLastOwner();
  }

  /**
   * Live workload per member, in one pass rather than per-row queries.
   * "Today" is the salon's local day (Asia/Kolkata), not UTC, so an evening completion
   * is not counted against tomorrow.
   */
  private async loadWorkloads(
    salonId: string,
    staffIds: string[],
  ): Promise<Map<string, StaffWorkloadDto>> {
    const result = new Map<string, StaffWorkloadDto>();
    if (staffIds.length === 0) return result;

    const [serving, completed, preferred] = await Promise.all([
      this.prisma.queueEntry.findMany({
        where: { salonId, staffId: { in: staffIds }, state: 'in_service' },
        select: { id: true, staffId: true, tokenNumber: true },
      }),
      this.prisma.queueEntry.groupBy({
        by: ['staffId'],
        where: {
          salonId,
          staffId: { in: staffIds },
          state: 'completed',
          completedAt: { gte: startOfSalonDay() },
        },
        _count: { _all: true },
      }),
      this.prisma.queueEntry.groupBy({
        by: ['preferredStaffId'],
        where: {
          salonId,
          preferredStaffId: { in: staffIds },
          state: { in: ['waiting', 'notified', 'checked_in'] },
        },
        _count: { _all: true },
      }),
    ]);

    for (const staffId of staffIds) {
      const active = serving.find((e) => e.staffId === staffId);
      result.set(staffId, {
        servingEntryId: active?.id ?? null,
        servingTokenNumber: active?.tokenNumber ?? null,
        completedToday: completed.find((c) => c.staffId === staffId)?._count._all ?? 0,
        preferredWaiting: preferred.find((p) => p.preferredStaffId === staffId)?._count._all ?? 0,
      });
    }
    return result;
  }

  private toDto(member: StaffRecord, workload: StaffWorkloadDto | undefined): StaffMemberDto {
    return {
      id: member.id,
      salonId: member.salonId,
      userId: member.userId,
      name: member.user.name ?? 'Staff',
      phoneMasked: maskPhone(member.user.phone),
      role: member.role as SalonRole,
      active: member.active,
      onShift: member.onShift,
      capabilities: member.capabilities.map((c) => ({
        serviceId: c.service.id,
        name: c.service.name,
        estimatedMinutes: c.service.estimatedMinutes,
      })),
      workload: workload ?? {
        servingEntryId: null,
        servingTokenNumber: null,
        completedToday: 0,
        preferredWaiting: 0,
      },
      createdAt: member.createdAt.toISOString(),
    };
  }
}

/**
 * Strips formatting so the same person entered as "+91 98765 43210" and "9876543210"
 * resolves to one account rather than two. Digits and a leading + only.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return plus ? `+${digits}` : digits;
}

/** Last four digits only, so a roster screen does not re-expose full numbers. */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return `••${digits}`;
  return `••••${digits.slice(-4)}`;
}

/** Midnight today in the salon's timezone, expressed as a UTC instant. */
export function startOfSalonDay(now: Date = new Date()): Date {
  // en-CA gives YYYY-MM-DD, which is what we need to rebuild the local calendar date.
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // Asia/Kolkata is UTC+5:30 year-round (no DST), so a fixed offset is correct here.
  return new Date(`${localDate}T00:00:00+05:30`);
}
