import { Injectable } from '@nestjs/common';
import { type Env, getValidatedEnv } from './env.validation';

/**
 * Typed accessor over the validated environment. Exposes only what callers need and
 * derives convenience values (CORS origins list, environment flags). Never exposes or
 * logs secret values wholesale.
 *
 * Reads from the module-level validated-env cache populated by validateEnv() at import
 * time, so it has no constructor dependencies and is safe to inject in any factory.
 */
@Injectable()
export class AppConfigService {
  private get<K extends keyof Env>(key: K): Env[K] {
    return getValidatedEnv()[key];
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get port(): number {
    return this.get('PORT');
  }

  get apiPrefix(): string {
    return this.get('API_PREFIX');
  }

  get apiVersion(): string {
    return this.get('API_VERSION');
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.get('LOG_LEVEL');
  }

  /** Always true: Soliton has no paid mode. Reported by /health/providers. */
  get freeLocalMode(): boolean {
    return this.get('FREE_LOCAL_MODE');
  }

  get mapProvider(): Env['MAP_PROVIDER'] {
    return this.get('MAP_PROVIDER');
  }

  get otpProvider(): Env['OTP_PROVIDER'] {
    return this.get('OTP_PROVIDER');
  }

  get paymentProvider(): Env['PAYMENT_PROVIDER'] {
    return this.get('PAYMENT_PROVIDER');
  }

  get paymentsEnabled(): boolean {
    return this.get('PAYMENTS_ENABLED');
  }

  get mockPaymentsEnabled(): boolean {
    return this.get('MOCK_PAYMENTS_ENABLED');
  }

  get messagingProvider(): Env['MESSAGING_PROVIDER'] {
    return this.get('MESSAGING_PROVIDER');
  }

  get storageProvider(): Env['STORAGE_PROVIDER'] {
    return this.get('STORAGE_PROVIDER');
  }

  get analyticsProvider(): Env['ANALYTICS_PROVIDER'] {
    return this.get('ANALYTICS_PROVIDER');
  }

  get mapTileUrlTemplate(): string | undefined {
    return this.get('MAP_TILE_URL_TEMPLATE');
  }

  get mapTileAttribution(): string | undefined {
    return this.get('MAP_TILE_ATTRIBUTION');
  }

  /** Redis connection URL (optional — realtime runs single-node without it). */
  get redisUrl(): string | undefined {
    return this.get('REDIS_URL');
  }

  /**
   * JWT access-token signing secret. Required in production (validated at startup);
   * a clearly-insecure fallback is used in dev/test so the API boots without a secret.
   */
  get jwtAccessSecret(): string {
    const secret = this.get('JWT_ACCESS_SECRET');
    if (secret) return secret;
    if (this.isProduction) {
      throw new Error('JWT_ACCESS_SECRET is required in production');
    }
    return 'dev-insecure-access-secret-change-me';
  }

  get jwtAccessTtl(): string {
    return this.get('JWT_ACCESS_TTL');
  }

  get jwtRefreshTtlDays(): number {
    return this.get('JWT_REFRESH_TTL_DAYS');
  }

  /** Parsed CORS origins. '*' means reflect any origin (development convenience). */
  get corsOrigins(): '*' | string[] {
    const raw = this.get('CORS_ORIGINS').trim();
    if (raw === '*' || raw === '') return '*';
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
}
