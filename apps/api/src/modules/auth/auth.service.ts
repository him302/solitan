import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthTokens, CurrentUser } from '@soliton/api-contract';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password/password.service';
import { OtpService } from './otp/otp.service';
import { TokenService } from './tokens/token.service';

/** Orchestrates authentication flows. No business logic beyond auth lives here. */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
  ) {}

  async requestOtp(phone: string): Promise<void> {
    await this.otp.request(phone);
  }

  async verifyOtp(phone: string, code: string): Promise<AuthTokens> {
    await this.otp.verify(phone, code);
    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, role: 'customer' },
    });
    return this.issueTokens({ id: user.id, role: user.role });
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Password login is for staff/owner/admin only; customers use OTP.
    if (!user || !user.passwordHash || user.role === 'customer') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.passwords.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens({ id: user.id, role: user.role });
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const { userId, refreshToken } = await this.tokens.rotateRefreshToken(rawRefreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    return {
      accessToken: this.tokens.signAccessToken({ id: user.id, role: user.role }),
      refreshToken,
      expiresInSeconds: this.tokens.accessTtlSeconds(),
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.tokens.revokeRefreshToken(rawRefreshToken);
  }

  async me(userId: string): Promise<CurrentUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, role: user.role, phone: user.phone, email: user.email, name: user.name };
  }

  private async issueTokens(user: { id: string; role: CurrentUser['role'] }): Promise<AuthTokens> {
    return {
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: await this.tokens.issueRefreshToken(user.id),
      expiresInSeconds: this.tokens.accessTtlSeconds(),
    };
  }
}
