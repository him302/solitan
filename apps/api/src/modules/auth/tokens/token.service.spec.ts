import { JwtService } from '@nestjs/jwt';
import type { AppConfigService } from '../../config/app-config.service';
import { InMemoryRefreshTokenRepository } from './refresh-token.repository.memory';
import { TokenService, parseDurationSeconds } from './token.service';

const config = {
  jwtAccessSecret: 'test-secret-0123456789abcdef',
  jwtAccessTtl: '15m',
  jwtRefreshTtlDays: 30,
} as unknown as AppConfigService;

function makeService(): { service: TokenService; jwt: JwtService } {
  const jwt = new JwtService({});
  const repo = new InMemoryRefreshTokenRepository();
  return { service: new TokenService(jwt, config, repo), jwt };
}

describe('TokenService', () => {
  it('signs and verifies an access token', () => {
    const { service } = makeService();
    const token = service.signAccessToken({ id: 'u1', role: 'customer' });
    const payload = service.verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('customer');
  });

  it('rejects an expired access token', () => {
    const { service, jwt } = makeService();
    const expired = jwt.sign(
      { sub: 'u1', role: 'customer' },
      { secret: config.jwtAccessSecret, expiresIn: -10 },
    );
    expect(() => service.verifyAccessToken(expired)).toThrow();
  });

  it('rejects a malformed access token', () => {
    const { service } = makeService();
    expect(() => service.verifyAccessToken('not.a.jwt')).toThrow();
  });

  it('rotates refresh tokens and invalidates the old one', async () => {
    const { service } = makeService();
    const raw = await service.issueRefreshToken('u1');
    const rotated = await service.rotateRefreshToken(raw);
    expect(rotated.userId).toBe('u1');
    expect(rotated.refreshToken).not.toBe(raw);
    // old token can no longer be rotated
    await expect(service.rotateRefreshToken(raw)).rejects.toThrow();
    // new token works
    await expect(service.rotateRefreshToken(rotated.refreshToken)).resolves.toBeDefined();
  });

  it('revokes a refresh token', async () => {
    const { service } = makeService();
    const raw = await service.issueRefreshToken('u1');
    await service.revokeRefreshToken(raw);
    await expect(service.rotateRefreshToken(raw)).rejects.toThrow();
  });

  it('parses durations to seconds', () => {
    expect(parseDurationSeconds('15m')).toBe(900);
    expect(parseDurationSeconds('2h')).toBe(7200);
    expect(parseDurationSeconds('7d')).toBe(604800);
  });
});
