import { Injectable } from '@nestjs/common';
import { logger } from '../../../common/logging/logger';

/** Delivers an OTP code to a phone number. Real providers (SMS) are wired later. */
export interface OtpProvider {
  send(phone: string, code: string): Promise<void>;
}

export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

/**
 * Development OTP provider. Logs the code ONLY outside production so it can be used for
 * local testing. It never logs the code in production, and carries no real credentials.
 */
@Injectable()
export class DevOtpProvider implements OtpProvider {
  async send(phone: string, code: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug({ phone }, `dev OTP for ${phone}: ${code}`);
    }
  }
}
