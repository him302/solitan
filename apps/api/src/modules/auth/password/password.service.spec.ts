import { PasswordService } from './password.service';

describe('PasswordService (Argon2)', () => {
  const service = new PasswordService();

  it('hashes to a non-plaintext value and verifies correctly', async () => {
    const hash = await service.hash('correct horse battery');
    expect(hash).not.toBe('correct horse battery');
    expect(hash.startsWith('$argon2')).toBe(true);
    expect(await service.verify(hash, 'correct horse battery')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('correct horse battery');
    expect(await service.verify(hash, 'wrong password')).toBe(false);
  });
});
