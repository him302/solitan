import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  discoveryQuerySchema,
  mapQuerySchema,
  type DiscoveryPage,
  type DiscoveryQuery,
  type MapMarkersResponse,
  type MapQuery,
} from '@soliton/api-contract';
import { ErrorCode } from '../../common/errors/error-codes';
import { ZodQueryPipe } from '../../common/validation/zod.pipe';
import { DiscoveryService } from './discovery.service';

/** Public (unauthenticated) discovery of Soliton-connected salons. Throttled and bounded. */
@ApiTags('discovery')
@Controller({ path: 'discovery', version: '1' })
@UseGuards(ThrottlerGuard)
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get('salons')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  salons(
    @Query(new ZodQueryPipe(discoveryQuerySchema, ErrorCode.INVALID_DISCOVERY_QUERY))
    query: DiscoveryQuery,
  ): Promise<DiscoveryPage> {
    return this.discovery.search(query);
  }

  @Get('map')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  map(
    @Query(new ZodQueryPipe(mapQuerySchema, ErrorCode.INVALID_DISCOVERY_QUERY)) query: MapQuery,
  ): Promise<MapMarkersResponse> {
    return this.discovery.mapMarkers(query);
  }
}
