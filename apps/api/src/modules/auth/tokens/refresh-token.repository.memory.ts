import { randomUUID } from 'node:crypto';
import type { RefreshTokenRecord, RefreshTokenRepository } from './refresh-token.repository';

/** In-memory refresh-token repository used by unit tests (no database required). */
export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly byHash = new Map<string, RefreshTokenRecord & { tokenHash: string }>();

  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    this.byHash.set(input.tokenHash, {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
    });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.byHash.get(tokenHash) ?? null;
  }

  async revokeById(id: string): Promise<void> {
    for (const record of this.byHash.values()) {
      if (record.id === id) record.revokedAt = new Date();
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const record of this.byHash.values()) {
      if (record.userId === userId && !record.revokedAt) record.revokedAt = new Date();
    }
  }
}
