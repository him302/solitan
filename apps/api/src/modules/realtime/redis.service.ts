import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

export type RedisStatus = 'disabled' | 'connecting' | 'up' | 'down';

/**
 * Owns the Redis connection and tracks its real status (for honest health reporting).
 * When no REDIS_URL is configured, realtime runs single-node and status is 'disabled'.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private currentStatus: RedisStatus = 'disabled';

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    const url = this.config.redisUrl;
    if (!url) {
      this.currentStatus = 'disabled';
      return;
    }
    this.currentStatus = 'connecting';
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    this.client.on('ready', () => {
      this.currentStatus = 'up';
    });
    this.client.on('end', () => {
      this.currentStatus = 'down';
    });
    this.client.on('error', (error: Error) => {
      this.currentStatus = 'down';
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });
    this.client.connect().catch(() => {
      this.currentStatus = 'down';
    });
  }

  get status(): RedisStatus {
    return this.currentStatus;
  }

  /** The primary client (null when Redis is disabled). */
  getClient(): Redis | null {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client?.quit();
    } catch {
      // ignore shutdown errors
    }
  }
}
