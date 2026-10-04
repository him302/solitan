import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { OTP_STORE, type OtpStore } from './otp-store';
import { OTP_PROVIDER, type OtpProvider } from './otp-provider';

const CODE_LENGTH = 6;
const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** OTP request + verification with basic abuse protection (TTL + attempt cap). */
@Injectable()
export class OtpService {
  constructor(
    @Inject(OTP_STORE) private readonly store: OtpStore,
    @Inject(OTP_PROVIDER) private readonly provider: OtpProvider,
  ) {}

  async request(phone: string): Promise<void> {
    const code = this.generateCode();
    await this.store.set(phone, { code, expiresAt: Date.now() + TTL_MS, attempts: 0 });
    await this.provider.send(phone, code);
  }

  async verify(phone: string, code: string): Promise<void> {
    const record = await this.store.get(phone);
    if (!record || record.expiresAt < Date.now()) {
      await this.store.delete(phone);
      throw new UnauthorizedException('Invalid or expired code');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      await this.store.delete(phone);
      throw new UnauthorizedException('Too many attempts');
    }
    if (record.code !== code) {
      await this.store.set(phone, { ...record, attempts: record.attempts + 1 });
      throw new UnauthorizedException('Invalid or expired code');
    }
    await this.store.delete(phone);
  }

  private generateCode(): string {
    return randomInt(0, 10 ** CODE_LENGTH)
      .toString()
      .padStart(CODE_LENGTH, '0');
  }
}
