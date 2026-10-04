import { Injectable } from '@nestjs/common';
import type { SalonRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Resolves a user's operational role within a salon (null if not an active member). */
export interface SalonMembershipChecker {
  getSalonRole(userId: string, salonId: string): Promise<SalonRole | null>;
}

export const SALON_MEMBERSHIP = Symbol('SALON_MEMBERSHIP');

@Injectable()
export class PrismaSalonMembershipChecker implements SalonMembershipChecker {
  constructor(private readonly prisma: PrismaService) {}

  async getSalonRole(userId: string, salonId: string): Promise<SalonRole | null> {
    const membership = await this.prisma.salonStaff.findFirst({
      where: { userId, salonId, active: true },
      select: { role: true },
    });
    return membership?.role ?? null;
  }
}
