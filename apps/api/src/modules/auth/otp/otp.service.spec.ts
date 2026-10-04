import { InMemoryOtpStore } from './otp-store';
import type { OtpProvider } from './otp-provider';
import { OtpService } from './otp.service';

const PHONE = '+15550001111';

describe('OtpService', () => {
  let store: InMemoryOtpStore;
  let provider: OtpProvider;
  let service: OtpService;

  beforeEach(() => {
    store = new InMemoryOtpStore();
    provider = { send: jest.fn().mockResolvedValue(undefined) };
    service = new OtpService(store, provider);
  });

  it('requests an OTP, storing a code and dispatching via the provider', async () => {
    await service.request(PHONE);
    const record = await store.get(PHONE);
    expect(record?.code).toMatch(/^\d{6}$/);
    expect(provider.send).toHaveBeenCalledWith(PHONE, record?.code);
  });

  it('verifies the correct code and clears it', async () => {
    await service.request(PHONE);
    const code = (await store.get(PHONE))!.code;
    await expect(service.verify(PHONE, code)).resolves.toBeUndefined();
    expect(await store.get(PHONE)).toBeNull();
  });

  it('rejects a wrong code and increments attempts', async () => {
    await service.request(PHONE);
    await expect(service.verify(PHONE, '000000')).rejects.toThrow();
    expect((await store.get(PHONE))?.attempts).toBe(1);
  });

  it('rejects an expired code', async () => {
    await store.set(PHONE, { code: '123456', expiresAt: Date.now() - 1000, attempts: 0 });
    await expect(service.verify(PHONE, '123456')).rejects.toThrow();
  });

  it('rejects after too many attempts', async () => {
    await store.set(PHONE, { code: '123456', expiresAt: Date.now() + 60_000, attempts: 5 });
    await expect(service.verify(PHONE, '123456')).rejects.toThrow();
  });
});
