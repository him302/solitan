import { JwtService } from '@nestjs/jwt';
import type { AppConfigService } from '../config/app-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password/password.service';
import { OtpService } from './otp/otp.service';
import { InMemoryOtpStore } from './otp/otp-store';
import { TokenService } from './tokens/token.service';
import { InMemoryRefreshTokenRepository } from './tokens/refresh-token.repository.memory';
import { AuthService } from './auth.service';

const config = {
  jwtAccessSecret: 'test-secret-0123456789abcdef',
  jwtAccessTtl: '15m',
  jwtRefreshTtlDays: 30,
} as unknown as AppConfigService;

const PHONE = '+15550002222';

interface PrismaUserMock {
  user: {
    upsert: jest.Mock;
    findUnique: jest.Mock;
  };
}

function build() {
  const prisma: PrismaUserMock = {
    user: { upsert: jest.fn(), findUnique: jest.fn() },
  };
  const passwords = new PasswordService();
  const tokens = new TokenService(new JwtService({}), config, new InMemoryRefreshTokenRepository());
  const otpStore = new InMemoryOtpStore();
  const otp = new OtpService(otpStore, { send: jest.fn().mockResolvedValue(undefined) });
  const service = new AuthService(prisma as unknown as PrismaService, passwords, tokens, otp);
  return { service, prisma, otpStore, passwords, tokens };
}

describe('AuthService', () => {
  it('issues tokens after OTP verification (customer)', async () => {
    const { service, prisma, otpStore } = build();
    await service.requestOtp(PHONE);
    const code = (await otpStore.get(PHONE))!.code;
    prisma.user.upsert.mockResolvedValue({
      id: 'u1',
      role: 'customer',
      phone: PHONE,
      email: null,
      name: null,
    });

    const tokens = await service.verifyOtp(PHONE, code);
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.expiresInSeconds).toBe(900);
  });

  it('logs in a staff/owner/admin with a correct password', async () => {
    const { service, prisma, passwords } = build();
    const passwordHash = await passwords.hash('password123');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      role: 'owner',
      email: 'o@x.com',
      passwordHash,
    });

    const tokens = await service.login('o@x.com', 'password123');
    expect(tokens.accessToken).toBeTruthy();
  });

  it('rejects invalid credentials (wrong password)', async () => {
    const { service, prisma, passwords } = build();
    const passwordHash = await passwords.hash('password123');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      role: 'owner',
      email: 'o@x.com',
      passwordHash,
    });
    await expect(service.login('o@x.com', 'wrong-password')).rejects.toThrow();
  });

  it('rejects password login for a customer account', async () => {
    const { service, prisma, passwords } = build();
    const passwordHash = await passwords.hash('password123');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u3',
      role: 'customer',
      email: 'c@x.com',
      passwordHash,
    });
    await expect(service.login('c@x.com', 'password123')).rejects.toThrow();
  });

  it('rejects login for an unknown user', async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login('nobody@x.com', 'password123')).rejects.toThrow();
  });

  it('refreshes and rotates, then rejects a logged-out token', async () => {
    const { service, prisma, tokens } = build();
    const raw = await tokens.issueRefreshToken('u1');
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'customer' });

    const refreshed = await service.refresh(raw);
    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).not.toBe(raw);

    await service.logout(refreshed.refreshToken);
    await expect(service.refresh(refreshed.refreshToken)).rejects.toThrow();
  });

  it('returns the current user', async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'customer',
      phone: PHONE,
      email: null,
      name: null,
    });
    const me = await service.me('u1');
    expect(me).toEqual({ id: 'u1', role: 'customer', phone: PHONE, email: null, name: null });
  });
});
