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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  addStaffSchema,
  setOwnShiftSchema,
  setStaffServicesSchema,
  updateStaffSchema,
  type AddStaffInput,
  type PublicStaffDto,
  type SetOwnShiftInput,
  type SetStaffServicesInput,
  type StaffListDto,
  type StaffMemberDto,
  type UpdateStaffInput,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { SalonScopeGuard } from '../auth/guards/salon-scope.guard';
import { ErrorCode } from '../../common/errors/error-codes';
import { ZodPipe } from '../../common/validation/zod.pipe';
import { StaffService } from './staff.service';

/**
 * Staff management (Part 8). Writes are owner-only; the check happens inside
 * StaffService against the database rather than being inferred from the URL.
 */
@ApiTags('staff')
@Controller({ path: 'salons/:salonId/staff', version: '1' })
@UseGuards(ThrottlerGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  /** Public: names only, for "who will serve me" on the salon page. */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  listPublic(@Param('salonId', ParseUUIDPipe) salonId: string): Promise<PublicStaffDto[]> {
    return this.staff.listPublic(salonId);
  }

  /** Owner: full roster with capabilities and live workload. */
  @Get('manage')
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  list(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ): Promise<StaffListDto> {
    return this.staff.list(user, salonId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  add(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body(new ZodPipe(addStaffSchema, ErrorCode.STAFF_INVALID)) body: AddStaffInput,
  ): Promise<StaffMemberDto> {
    return this.staff.add(user, salonId, body);
  }

  @Get(':staffId')
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  get(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<StaffMemberDto> {
    return this.staff.get(user, salonId, staffId);
  }

  @Patch(':staffId')
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  update(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body(new ZodPipe(updateStaffSchema, ErrorCode.STAFF_INVALID)) body: UpdateStaffInput,
  ): Promise<StaffMemberDto> {
    return this.staff.update(user, salonId, staffId, body);
  }

  /** Replaces the capability set wholesale, so removals need no separate call. */
  @Put(':staffId/services')
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  setServices(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body(new ZodPipe(setStaffServicesSchema, ErrorCode.STAFF_INVALID))
    body: SetStaffServicesInput,
  ): Promise<StaffMemberDto> {
    return this.staff.setServices(user, salonId, staffId, body);
  }

  /** Soft removal: served queue history and audit rows keep referencing the membership. */
  @Delete(':staffId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, SalonScopeGuard)
  remove(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<StaffMemberDto> {
    return this.staff.remove(user, salonId, staffId);
  }
}

/**
 * A staff member acting on their own membership. Separate from the owner routes above and
 * deliberately takes no staffId, so one member cannot clock another in or out.
 */
@ApiTags('staff')
@Controller({ path: 'me/shift', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class MyShiftController {
  constructor(private readonly staff: StaffService) {}

  @Patch()
  setOwnShift(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(setOwnShiftSchema, ErrorCode.STAFF_INVALID)) body: SetOwnShiftInput,
  ): Promise<StaffMemberDto> {
    return this.staff.setOwnShift(user, body.onShift);
  }
}
