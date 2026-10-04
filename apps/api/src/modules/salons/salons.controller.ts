import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  createSalonSchema,
  putHoursSchema,
  updateSalonSchema,
  viewerLocationQuerySchema,
  type CreateSalonInput,
  type MySalonDto,
  type OperatingHoursDto,
  type PutHoursInput,
  type SalonDetailDto,
  type UpdateSalonInput,
  type ViewerLocationQuery,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SalonScopeGuard } from '../auth/guards/salon-scope.guard';
import { ErrorCode } from '../../common/errors/error-codes';
import { ZodPipe, ZodQueryPipe } from '../../common/validation/zod.pipe';
import { SalonsService } from './salons.service';

type MaybeAuthed = Request & { user?: RequestUser };

@ApiTags('salons')
@Controller({ path: 'salons', version: '1' })
@UseGuards(ThrottlerGuard)
export class SalonsController {
  constructor(private readonly salons: SalonsService) {}

  /** Owners create their salon. ownerId is always the authenticated user. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createSalonSchema)) body: CreateSalonInput,
  ): Promise<MySalonDto> {
    return this.salons.create(user, body);
  }

  /** Public salon detail (active salons). Optional lat/lng yields PostGIS distance. */
  @Get(':salonId')
  @UseGuards(OptionalJwtAuthGuard)
  detail(
    @Req() req: MaybeAuthed,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Query(new ZodQueryPipe(viewerLocationQuerySchema, ErrorCode.INVALID_LOCATION))
    viewer: ViewerLocationQuery,
  ): Promise<SalonDetailDto> {
    const location =
      viewer.lat !== undefined && viewer.lng !== undefined
        ? { latitude: viewer.lat, longitude: viewer.lng }
        : undefined;
    return this.salons.getDetail(req.user, salonId, location);
  }

  @Patch(':salonId')
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  update(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body(new ZodPipe(updateSalonSchema)) body: UpdateSalonInput,
  ): Promise<MySalonDto> {
    return this.salons.update(user, salonId, body);
  }

  @Get(':salonId/hours')
  @UseGuards(OptionalJwtAuthGuard)
  hours(
    @Req() req: MaybeAuthed,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ): Promise<OperatingHoursDto> {
    return this.salons.getHours(req.user, salonId);
  }

  @Put(':salonId/hours')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  putHours(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body(new ZodPipe(putHoursSchema, ErrorCode.INVALID_OPERATING_HOURS)) body: PutHoursInput,
  ): Promise<OperatingHoursDto> {
    return this.salons.putHours(user, salonId, body);
  }
}

@ApiTags('salons')
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(private readonly salons: SalonsService) {}

  @Get('salon')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  mySalon(@CurrentUser() user: RequestUser): Promise<MySalonDto> {
    return this.salons.getMine(user);
  }
}
