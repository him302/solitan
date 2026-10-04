import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { AppConfigService } from '../../config/app-config.service';
import { InMemoryRefreshTokenRepository } from '../tokens/refresh-token.repository.memory';
import { TokenService } from '../tokens/token.service';
import type { SalonMembershipChecker } from '../salon-membership.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { SalonScopeGuard } from './salon-scope.guard';

const SALON = '11111111-1111-4111-8111-111111111111';

const config = {
  jwtAccessSecret: 'test-secret-0123456789abcdef',
  jwtAccessTtl: '15m',
  jwtRefreshTtlDays: 30,
} as unknown as AppConfigService;

function ctx(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({}) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const tokens = new TokenService(new JwtService({}), config, new InMemoryRefreshTokenRepository());
  const guard = new JwtAuthGuard(tokens);

  it('accepts a valid bearer token and attaches the user', () => {
    const token = tokens.signAccessToken({ id: 'u1', role: 'staff' });
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: { authorization: `Bearer ${token}` },
    };
    expect(guard.canActivate(ctx(request))).toBe(true);
    expect(request.user).toEqual({ id: 'u1', role: 'staff' });
  });

  it('rejects a missing token', () => {
    expect(() => guard.canActivate(ctx({ headers: {} }))).toThrow();
  });

  it('rejects an invalid token', () => {
    expect(() => guard.canActivate(ctx({ headers: { authorization: 'Bearer nope' } }))).toThrow();
  });
});

describe('RolesGuard', () => {
  function guardReturning(roles: string[] | undefined): RolesGuard {
    const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('allows when no roles are required', () => {
    expect(
      guardReturning(undefined).canActivate(ctx({ user: { id: 'u', role: 'customer' } })),
    ).toBe(true);
  });

  it('allows when the user role is permitted', () => {
    expect(
      guardReturning(['owner', 'admin']).canActivate(ctx({ user: { id: 'u', role: 'owner' } })),
    ).toBe(true);
  });

  it('forbids when the user role is not permitted', () => {
    expect(() =>
      guardReturning(['admin']).canActivate(ctx({ user: { id: 'u', role: 'staff' } })),
    ).toThrow();
  });
});

describe('SalonScopeGuard', () => {
  function guardWith(role: 'owner' | 'staff' | null): SalonScopeGuard {
    const membership: SalonMembershipChecker = { getSalonRole: jest.fn().mockResolvedValue(role) };
    return new SalonScopeGuard(membership);
  }

  it('allows admin across any salon', async () => {
    await expect(
      guardWith(null).canActivate(ctx({ user: { id: 'a', role: 'admin' }, params: {}, body: {} })),
    ).resolves.toBe(true);
  });

  it('forbids customers', async () => {
    await expect(
      guardWith(null).canActivate(
        ctx({ user: { id: 'c', role: 'customer' }, params: { salonId: SALON }, body: {} }),
      ),
    ).rejects.toThrow();
  });

  it('allows an active member of the salon', async () => {
    await expect(
      guardWith('staff').canActivate(
        ctx({ user: { id: 'u', role: 'staff' }, params: { salonId: SALON }, body: {} }),
      ),
    ).resolves.toBe(true);
  });

  it('forbids a non-member', async () => {
    await expect(
      guardWith(null).canActivate(
        ctx({ user: { id: 'u', role: 'staff' }, params: { salonId: SALON }, body: {} }),
      ),
    ).rejects.toThrow();
  });

  it('forbids a malformed salon id before it can reach the database', async () => {
    await expect(
      guardWith('staff').canActivate(
        ctx({ user: { id: 'u', role: 'staff' }, params: { salonId: 'not-a-uuid' }, body: {} }),
      ),
    ).rejects.toMatchObject({ code: 'SALON_ACCESS_DENIED' });
  });

  it('forbids when no salon scope is present', async () => {
    await expect(
      guardWith('staff').canActivate(
        ctx({ user: { id: 'u', role: 'staff' }, params: {}, body: {} }),
      ),
    ).rejects.toThrow();
  });
});
