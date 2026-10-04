import { Injectable } from '@nestjs/common';

export interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

/**
 * OTP storage seam. The in-memory implementation is for local development only.
 *
 * PRODUCTION NOTE: production OTP storage belongs in Redis (shared, TTL-backed,
 * multi-instance). Redis is NOT implemented yet — only this interface/seam exists.
 * A RedisOtpStore will be wired in the realtime/infrastructure phase.
 */
export interface OtpStore {
  get(phone: string): Promise<OtpRecord | null>;
  set(phone: string, record: OtpRecord): Promise<void>;
  delete(phone: string): Promise<void>;
}

export const OTP_STORE = Symbol('OTP_STORE');

/** Development/in-memory OTP store. Not suitable for production (per-process only). */
@Injectable()
export class InMemoryOtpStore implements OtpStore {
  private readonly map = new Map<string, OtpRecord>();

  async get(phone: string): Promise<OtpRecord | null> {
    return this.map.get(phone) ?? null;
  }

  async set(phone: string, record: OtpRecord): Promise<void> {
    this.map.set(phone, record);
  }

  async delete(phone: string): Promise<void> {
    this.map.delete(phone);
  }
}
