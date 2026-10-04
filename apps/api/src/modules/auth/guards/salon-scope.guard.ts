import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { salonAccessDenied } from '../../../common/errors/domain.exception';
import { SALON_MEMBERSHIP, type SalonMembershipChecker } from '../salon-membership.service';
import type { RequestUser } from '../decorators/current-user.decorator';

/**
 * Enforces salon-scoped access:
 *  - ADMIN     → allowed (cross-salon platform access)
 *  - CUSTOMER  → denied (customers never access salon-scoped resources)
 *  - OWNER/STAFF → allowed only for a salon they are an active member of
 *
 * The salon id is read from the route param `salonId` or the request body. Owner-only
 * routes additionally use `@Roles('owner')`; this guard enforces membership.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SalonScopeGuard implements CanActivate {
  constructor(@Inject(SALON_MEMBERSHIP) private readonly membership: SalonMembershipChecker) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: RequestUser;
        params: Record<string, string>;
        body: Record<string, unknown>;
      }
    >();
    const user = request.user;
    if (!user) throw new UnauthorizedException();
    if (user.role === 'admin') return true;
    if (user.role === 'customer') {
      throw salonAccessDenied();
    }

    const salonId = request.params?.salonId ?? (request.body?.salonId as string | undefined);
    if (!salonId || !UUID_PATTERN.test(salonId)) throw salonAccessDenied();

    const role = await this.membership.getSalonRole(user.id, salonId);
    if (!role) throw salonAccessDenied();
    return true;
  }
}
