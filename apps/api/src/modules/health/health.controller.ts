import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse, ProviderPolicyDto } from '@soliton/api-contract';
import { HealthService } from './health.service';
import { ProviderPolicyService } from '../providers/provider-policy.service';
import { RedisService } from '../realtime/redis.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Health endpoints. Liveness reports process state. Readiness checks database
 * connectivity before accepting traffic. The realtime endpoint honestly reports Redis.
 */
@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly redis: RedisService,
    private readonly providers: ProviderPolicyService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Process is alive.' })
  liveness(): HealthResponse {
    return this.health.getHealth();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Process is ready: database is reachable.' })
  async readiness(): Promise<HealthResponse & { database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database not ready');
    }
    return { ...this.health.getHealth(), database: 'up' };
  }

  /** Which provider is active per concern. Soliton has no paid mode, so no external calls. */
  @Get('providers')
  @ApiOkResponse({ description: 'Active provider policy (free/local only).' })
  providerPolicy(): ProviderPolicyDto {
    return this.providers.describe();
  }

  @Get('realtime')
  @ApiOkResponse({ description: 'Realtime infrastructure status (honest Redis state).' })
  realtime(): { status: 'ok' | 'degraded'; redis: string; adapter: 'redis' | 'in-memory' } {
    const redisStatus = this.redis.status;
    const healthy = redisStatus === 'up' || redisStatus === 'disabled';
    return {
      status: healthy ? 'ok' : 'degraded',
      redis: redisStatus,
      adapter: redisStatus === 'up' ? 'redis' : 'in-memory',
    };
  }
}
