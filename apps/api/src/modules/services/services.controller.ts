import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type ServiceDto,
  type UpdateServiceInput,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { SalonScopeGuard } from '../auth/guards/salon-scope.guard';
import { ErrorCode } from '../../common/errors/error-codes';
import { ZodPipe } from '../../common/validation/zod.pipe';
import { ServicesService } from './services.service';

type MaybeAuthed = Request & { user?: RequestUser };

@ApiTags('services')
@Controller({ path: 'salons/:salonId/services', version: '1' })
@UseGuards(ThrottlerGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(
    @Req() req: MaybeAuthed,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ): Promise<ServiceDto[]> {
    return this.services.list(req.user, salonId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  create(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body(new ZodPipe(createServiceSchema, ErrorCode.INVALID_SERVICE)) body: CreateServiceInput,
  ): Promise<ServiceDto> {
    return this.services.create(user, salonId, body);
  }

  @Get(':serviceId')
  @UseGuards(OptionalJwtAuthGuard)
  get(
    @Req() req: MaybeAuthed,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<ServiceDto> {
    return this.services.get(req.user, salonId, serviceId);
  }

  @Patch(':serviceId')
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  update(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body(new ZodPipe(updateServiceSchema, ErrorCode.INVALID_SERVICE)) body: UpdateServiceInput,
  ): Promise<ServiceDto> {
    return this.services.update(user, salonId, serviceId, body);
  }

  /** Soft delete: sets active=false so queue/appointment history stays valid. */
  @Delete(':serviceId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  deactivate(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<ServiceDto> {
    return this.services.deactivate(user, salonId, serviceId);
  }
}
