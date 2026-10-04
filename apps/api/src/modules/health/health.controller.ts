import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse, ProviderPolicyDto } from '@soliton/api-contract';
import { HealthService } from './health.service';
import { ProviderPolicyService } from '../providers/provider-policy.service';
import { RedisService } from '../realtime/redis.service';

/**
 * Health endpoints. Liveness/readiness report PROCESS health only. The realtime
 * endpoint reports the REAL Redis status — it never claims Redis is healthy when the
 * connection is unavailable.
 */
@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly redis: RedisService,
    private readonly providers: ProviderPolicyService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Process is alive.' })
  liveness(): HealthResponse {
    return this.health.getHealth();
  }

  @Get('ready')
  @ApiOkResponse({
    description: 'Process has booted and is accepting traffic (no dependency checks yet).',
  })
  readiness(): HealthResponse {
    return this.health.getHealth();
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
