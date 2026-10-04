import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client integration.
 *
 * Connection is lazy by design: we do NOT call $connect() on module init, so the API
 * still boots without a database (no feature uses the client yet in this phase).
 * The first query establishes the connection. Shutdown is graceful via onModuleDestroy
 * (Nest shutdown hooks are enabled in main.ts).
 *
 * Repositories/business services are intentionally NOT created here yet.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Intentionally no eager $connect(): keeps the API bootable without a database.
    this.logger.log('PrismaService ready (lazy connection).');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
