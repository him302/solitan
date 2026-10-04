import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import type { Role } from '@soliton/api-contract';
import { AppConfigService } from '../../config/app-config.service';
import {
  REFRESH_TOKEN_REPOSITORY,
  hashRefreshToken,
  type RefreshTokenRepository,
} from './refresh-token.repository';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

/** Issues/validates access JWTs and manages rotating, hashed refresh tokens. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  signAccessToken(user: { id: string; role: Role }): string {
    return this.jwt.sign(
      { sub: user.id, role: user.role },
      { secret: this.config.jwtAccessSecret, expiresIn: this.config.jwtAccessTtl },
    );
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token, { secret: this.config.jwtAccessSecret });
  }

  accessTtlSeconds(): number {
    return parseDurationSeconds(this.config.jwtAccessTtl);
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000);
    await this.refreshTokens.create({ userId, tokenHash: hashRefreshToken(raw), expiresAt });
    return raw;
  }

  /** Validates a refresh token, revokes it, and issues a replacement (rotation). */
  async rotateRefreshToken(raw: string): Promise<{ userId: string; refreshToken: string }> {
    const record = await this.refreshTokens.findByHash(hashRefreshToken(raw));
    if (!record || record.revokedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.refreshTokens.revokeById(record.id);
    const refreshToken = await this.issueRefreshToken(record.userId);
    return { userId: record.userId, refreshToken };
  }

  async revokeRefreshToken(raw: string): Promise<void> {
    const record = await this.refreshTokens.findByHash(hashRefreshToken(raw));
    if (record && !record.revokedAt) {
      await this.refreshTokens.revokeById(record.id);
    }
  }
}

/** Parses durations like "15m", "900s", "2h", "7d" into seconds. */
export function parseDurationSeconds(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) {
    const asNumber = Number(input);
    if (Number.isFinite(asNumber)) return asNumber;
    throw new Error(`Invalid duration: ${input}`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const factor = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return value * factor;
}
