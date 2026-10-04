import { Inject, Injectable } from '@nestjs/common';
import { parseRoom, type Role } from '@soliton/api-contract';
import type { SalonRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RealtimeUser {
  id: string;
  role: Role;
}

/** Resolves a user's salon role (null if not an active member). */
export interface SalonAccess {
  getSalonRole(userId: string, salonId: string): Promise<SalonRole | null>;
}

/** Decides whether a user may access a specific queue entry's room. */
export interface EntryAccess {
  canAccess(user: RealtimeUser, entryId: string): Promise<boolean>;
}

export const SALON_ACCESS = Symbol('SALON_ACCESS');
export const ENTRY_ACCESS = Symbol('ENTRY_ACCESS');

@Injectable()
export class PrismaSalonAccess implements SalonAccess {
  constructor(private readonly prisma: PrismaService) {}

  async getSalonRole(userId: string, salonId: string): Promise<SalonRole | null> {
    const membership = await this.prisma.salonStaff.findFirst({
      where: { userId, salonId, active: true },
      select: { role: true },
    });
    return membership?.role ?? null;
  }
}

@Injectable()
export class PrismaEntryAccess implements EntryAccess {
  constructor(private readonly prisma: PrismaService) {}

  async canAccess(user: RealtimeUser, entryId: string): Promise<boolean> {
    const entry = await this.prisma.queueEntry.findUnique({
      where: { id: entryId },
      select: { customerId: true, salonId: true },
    });
    if (!entry) return false;
    if (user.role === 'customer') return entry.customerId === user.id;
    const membership = await this.prisma.salonStaff.findFirst({
      where: { userId: user.id, salonId: entry.salonId, active: true },
      select: { id: true },
    });
    return membership !== null;
  }
}

/**
 * Central room authorization. Clients can only subscribe to rooms they are entitled to:
 *  - admin: any room (cross-salon)
 *  - salon room: owner/staff members only (never customers)
 *  - entry room: the entry's customer, or staff/owner of the entry's salon
 * Malformed/unknown rooms are denied.
 */
@Injectable()
export class RoomAuthorizer {
  constructor(
    @Inject(SALON_ACCESS) private readonly salon: SalonAccess,
    @Inject(ENTRY_ACCESS) private readonly entry: EntryAccess,
  ) {}

  async authorize(user: RealtimeUser, room: string): Promise<boolean> {
    const ref = parseRoom(room);
    if (!ref) return false;
    if (user.role === 'admin') return true;
    if (ref.kind === 'salon') {
      if (user.role === 'customer') return false;
      return (await this.salon.getSalonRole(user.id, ref.id)) !== null;
    }
    return this.entry.canAccess(user, ref.id);
  }
}
