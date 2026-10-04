import { Controller, Get, HttpStatus, Inject, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { MapsProvider } from '@soliton/maps';
import { geocodeQuerySchema, type GeocodeResponse } from '@soliton/api-contract';
import { DomainException } from '../../common/errors/domain.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { ZodQueryPipe } from '../../common/validation/zod.pipe';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MAPS_PROVIDER } from './maps.tokens';

@ApiTags('maps')
@Controller({ path: 'maps', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin')
export class MapsController {
  constructor(@Inject(MAPS_PROVIDER) private readonly maps: MapsProvider) {}

  /**
   * Optional address → coordinates helper. The free local provider cannot geocode, so by
   * default this answers `{ available: false }` (HTTP 200) and owners enter latitude and
   * longitude themselves. It never guesses coordinates and never calls an external service.
   */
  @Get('geocode')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async geocode(
    @Query(new ZodQueryPipe(geocodeQuerySchema)) query: { address: string },
  ): Promise<GeocodeResponse> {
    const result = await this.maps.geocode(query.address);
    if (!result.available) return { available: false, reason: result.reason };
    if (result.value === null) {
      throw new DomainException(
        ErrorCode.INVALID_LOCATION,
        'Address could not be located',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      available: true,
      location: result.value.location,
      formattedAddress: result.value.formattedAddress,
    };
  }
}
