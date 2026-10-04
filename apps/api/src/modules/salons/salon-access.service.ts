import { Injectable } from '@nestjs/common';
import type { SalonRole } from '@prisma/client';
import { logger } from '../../common/logging/logger';
import { salonAccessDenied, salonNotFound } from '../../common/errors/domain.exception';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

export interface SalonVisibility {
  status: string;
  /** Admin, or an active owner/staff member of THIS salon. */
  isMember: boolean;
  memberRole: SalonRole | 'admin' | null;
}

/**
 * Server-side salon scope. A salonId from the client is only ever a lookup key: access is
 * always decided here from the authenticated user and the database.
 */
@Injectable()
export class SalonAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads the salon and decides what this viewer may see. Non-active salons are invisible
   * (404, not 403) to everyone except admins and the salon's own members, so their
   * existence is not leaked.
   */
  async resolveVisibility(
    viewer: RequestUser | undefined,
    salonId: string,
  ): Promise<SalonVisibility> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, status: true },
    });
    if (!salon) throw salonNotFound();

    let memberRole: SalonVisibility['memberRole'] = null;
    if (viewer?.role === 'admin') {
      memberRole = 'admin';
    } else if (viewer) {
      const membership = await this.prisma.salonStaff.findFirst({
        where: { userId: viewer.id, salonId, active: true },
        select: { role: true },
      });
      memberRole = membership?.role ?? null;
    }

    const isMember = memberRole !== null;
    if (salon.status !== 'active' && !isMember) throw salonNotFound();
    return { status: salon.status, isMember, memberRole };
  }

  /** Owner-only configuration (profile, hours, services). Admin is platform-wide. */
  async assertManager(user: RequestUser, salonId: string): Promise<void> {
    const visibility = await this.resolveVisibility(user, salonId);
    if (visibility.memberRole === 'admin' || visibility.memberRole === 'owner') return;
    logger.warn(
      { event: 'authorization_denied', userId: user.id, salonId, reason: 'not_owner' },
      'authorization_denied',
    );
    throw salonAccessDenied();
  }
}
