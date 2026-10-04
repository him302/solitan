import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../tokens/token.service';
import type { RequestUser } from '../decorators/current-user.decorator';

/**
 * For public routes that tailor their response to a signed-in viewer (e.g. staff may see
 * their own not-yet-active salon). No Authorization header → anonymous request. A header
 * that is present but invalid is rejected, so a stale token surfaces as 401 and the
 * client can refresh instead of being silently downgraded to anonymous.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const header = request.headers.authorization;
    if (!header) return true;
    if (!header.startsWith('Bearer '))
      throw new UnauthorizedException('Invalid authorization header');
    try {
      const payload = this.tokens.verifyAccessToken(header.slice('Bearer '.length));
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
