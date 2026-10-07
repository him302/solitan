import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  createAppointmentSchema,
  getAvailabilitySchema,
  listSalonAppointmentsSchema,
  type CreateAppointmentInput,
  type GetAvailabilityInput,
  type ListSalonAppointmentsInput,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodPipe, ZodQueryPipe } from '../../common/validation/zod.pipe';
import { AppointmentsService } from './appointments.service';

// ── Customer appointment routes (/me/appointments, /appointments/:id, …) ──────

@Controller({ path: 'me/appointments', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class MyAppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  /** GET /me/appointments — customer's own appointments. */
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.appts.listForCustomer(user.id);
  }
}

@Controller({ path: 'appointments', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  /** POST /appointments — book an appointment. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createAppointmentSchema)) body: CreateAppointmentInput,
  ) {
    return this.appts.create(user.id, body);
  }

  /** GET /appointments/:id — appointment detail. */
  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appts.getOne(id, user.id, user.role);
  }

  /** PATCH /appointments/:id/cancel — customer cancels. */
  @Patch(':id/cancel')
  @HttpCode(200)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appts.cancel(id, user.id);
  }

  /** POST /appointments/:id/on-way — customer taps "I'm On My Way". */
  @Post(':id/on-way')
  @HttpCode(200)
  onWay(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appts.onWay(id, user.id);
  }

  /** POST /appointments/:id/check-in — customer checks in → queue. */
  @Post(':id/check-in')
  @HttpCode(200)
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appts.checkIn(id, user.id);
  }

  /** POST /appointments/:id/no-show — staff marks no-show. */
  @Post(':id/no-show')
  @HttpCode(200)
  noShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appts.markNoShow(id, user.id);
  }

  /** POST /appointments/:id/start — staff starts service. */
  @Post(':id/start')
  @HttpCode(200)
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appts.startService(id, user.id);
  }

  /** POST /appointments/:id/complete — staff completes. */
  @Post(':id/complete')
  @HttpCode(200)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appts.complete(id, user.id);
  }
}

// ── Salon-scoped appointment routes (/salons/:salonId/appointments, /availability) ─

@Controller({ path: 'salons', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class SalonAppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  /** GET /salons/:salonId/availability?serviceId=&date= */
  @Get(':salonId/availability')
  availability(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Query(new ZodQueryPipe(getAvailabilitySchema)) query: GetAvailabilityInput,
  ) {
    return this.appts.getAvailability(salonId, query.serviceId, query.date);
  }

  /** GET /salons/:salonId/appointments?date=&status= — salon staff view. */
  @Get(':salonId/appointments')
  listForSalon(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Query(new ZodQueryPipe(listSalonAppointmentsSchema)) query: ListSalonAppointmentsInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appts.listForSalon(salonId, user.id, query.date, query.status);
  }
}
