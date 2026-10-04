import { validateEnv } from './env.validation';
import {
  DisabledMessagingProvider,
  DisabledPaymentProvider,
} from '../providers/disabled-providers';

describe('free-only provider policy (env validation)', () => {
  it('defaults every provider to its free/local/disabled value with no configuration at all', () => {
    const env = validateEnv({});
    expect(env).toMatchObject({
      FREE_LOCAL_MODE: true,
      MAP_PROVIDER: 'local',
      OTP_PROVIDER: 'dev',
      PAYMENT_PROVIDER: 'disabled',
      MESSAGING_PROVIDER: 'disabled',
      STORAGE_PROVIDER: 'local',
      ANALYTICS_PROVIDER: 'local',
    });
  });

  it('boots with no API keys of any kind', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).not.toThrow();
  });

  it.each([
    ['a paid map provider', { MAP_PROVIDER: 'google' }],
    ['leaving free-local mode', { FREE_LOCAL_MODE: 'false' }],
    ['an SMS OTP provider', { OTP_PROVIDER: 'sms' }],
    ['a payment gateway', { PAYMENT_PROVIDER: 'razorpay' }],
    ['a messaging provider', { MESSAGING_PROVIDER: 'twilio' }],
    ['hosted object storage', { STORAGE_PROVIDER: 's3' }],
    ['hosted analytics', { ANALYTICS_PROVIDER: 'mixpanel' }],
  ])('refuses %s at startup', (_label, patch) => {
    expect(() => validateEnv(patch)).toThrow(/Invalid environment configuration/);
  });

  it('requires a tile template to contain {z}, {x} and {y}', () => {
    expect(() =>
      validateEnv({ MAP_TILE_URL_TEMPLATE: 'https://tiles.example.org/tile.png' }),
    ).toThrow();
    expect(() =>
      validateEnv({ MAP_TILE_URL_TEMPLATE: 'https://tiles.example.org/{z}/{x}/{y}.png' }),
    ).not.toThrow();
  });

  it('still requires a JWT secret in production', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(/JWT_ACCESS_SECRET/);
  });
});

describe('disabled provider seams', () => {
  it('payments and messaging fail safe: PROVIDER_DISABLED, no I/O', async () => {
    const payment = new DisabledPaymentProvider();
    const messaging = new DisabledMessagingProvider();
    expect(payment.enabled).toBe(false);
    expect(messaging.enabled).toBe(false);
    expect(await payment.createPaymentIntent()).toEqual({
      available: false,
      reason: 'PROVIDER_DISABLED',
    });
    expect(await messaging.send()).toEqual({ available: false, reason: 'PROVIDER_DISABLED' });
  });
});
