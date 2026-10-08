import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  joinQueueSchema,
  staffActionSchema,
  lateReportSchema,
  lateResponseSchema,
  changeServiceSchema,
  announcementSchema,
  setCapacitySchema,
  noShowPolicySchema,
  type JoinQueueInput,
  type StaffActionInput,
  type LateReportInput,
  type LateResponseInput,
  type ChangeServiceInput,
  type AnnouncementInput,
  type SetCapacityInput,
  type NoShowPolicyInput,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodPipe } from '../../common/validation/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from './queue.service';

/** Shared helper: load the salonId from a queue entry. */
async function resolveSalonId(prisma: PrismaService, entryId: string): Promise<string> {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: entryId },
    select: { salonId: true },
  });
  if (!entry) throw new NotFoundException('Queue entry not found.');
  return entry.salonId;
}

// ── Customer booking flow (POST /bookings, GET/DELETE /bookings/:id, GET /me/bookings) ─

@ApiTags('queue')
@Controller({ path: 'bookings', version: '1' })
@UseGuards(ThrottlerGuard)
export class BookingsController {
  constructor(private readonly queue: QueueService) {}

  /** Phase 3: create = join queue. Backward-compat with Phase 2 booking API. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: RequestUser,
    @Body() body: { salonId?: string; serviceId?: string; preferredStaffId?: string },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!body.salonId || !body.serviceId) {
      throw new BadRequestException('salonId and serviceId are required');
    }
    return this.queue.joinQueue(user.id, body.salonId, body.serviceId, idempotencyKey, body.preferredStaffId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.queue.getCustomerBooking(user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.queue.leaveQueue(user.id, id);
  }
}

@ApiTags('queue')
@Controller({ path: 'me', version: '1' })
@UseGuards(ThrottlerGuard)
export class MeBookingsController {
  constructor(private readonly queue: QueueService) {}

  @Get('bookings')
  @UseGuards(JwtAuthGuard)
  listBookings(@CurrentUser() user: RequestUser) {
    return this.queue.listCustomerBookings(user.id);
  }
}

// ── Queue operations (customer join/leave + staff actions) ─────────────────

@ApiTags('queue')
@Controller({ path: 'queue', version: '1' })
@UseGuards(ThrottlerGuard)
export class QueueController {
  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  // Customer ─────────────────────────────────────────────────────────────

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  join(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(joinQueueSchema)) body: JoinQueueInput,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.queue.joinQueue(user.id, body.salonId, body.serviceId, idempotencyKey, body.preferredStaffId);
  }

  @Delete('entries/:entryId')
  @UseGuards(JwtAuthGuard)
  leave(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.queue.leaveQueue(user.id, entryId);
  }

  // Staff ────────────────────────────────────────────────────────────────

  @Get(':salonId/snapshot')
  @UseGuards(JwtAuthGuard)
  snapshot(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ) {
    return this.queue.getSalonSnapshot(user.id, salonId);
  }

  @Post('entries/:entryId/notify')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async notify(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    const salonId = await resolveSalonId(this.prisma, entryId);
    return this.queue.notifyEntry(user.id, salonId, entryId);
  }

  @Post('entries/:entryId/checkin')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async checkIn(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    const salonId = await resolveSalonId(this.prisma, entryId);
    return this.queue.checkInEntry(user.id, salonId, entryId);
  }

  @Post('entries/:entryId/start')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async start(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body(new ZodPipe(staffActionSchema)) body: StaffActionInput,
  ) {
    const salonId = await resolveSalonId(this.prisma, entryId);
    return this.queue.startService(user.id, salonId, entryId, body.chairId);
  }

  @Post('entries/:entryId/complete')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async complete(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    const salonId = await resolveSalonId(this.prisma, entryId);
    return this.queue.completeService(user.id, salonId, entryId);
  }

  @Post('entries/:entryId/noshow')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async noShow(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    const salonId = await resolveSalonId(this.prisma, entryId);
    return this.queue.markNoShow(user.id, salonId, entryId);
  }

  @Post(':salonId/pause')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  pause(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ) {
    return this.queue.pauseQueue(user.id, salonId);
  }

  @Post(':salonId/resume')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  resume(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ) {
    return this.queue.resumeQueue(user.id, salonId);
  }

  @Post(':salonId/close')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  close(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ) {
    return this.queue.closeQueue(user.id, salonId);
  }

  @Post(':salonId/open')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  open(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ) {
    return this.queue.openQueue(user.id, salonId);
  }

  @Post(':salonId/limited')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  limited(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ) {
    return this.queue.limitQueue(user.id, salonId);
  }

  @Post('entries/:entryId/arrive')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async arrive(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.queue.markArrived(user.id, entryId);
  }

  @Post('entries/:entryId/late')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async reportLate(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body(new ZodPipe(lateReportSchema)) body: LateReportInput,
  ) {
    return this.queue.reportLate(user.id, entryId, body);
  }

  @Post('entries/:entryId/late-response')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async lateResponse(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body(new ZodPipe(lateResponseSchema)) body: LateResponseInput,
  ) {
    const salonId = await resolveSalonId(this.prisma, entryId);
    return this.queue.respondLate(user.id, salonId, entryId, body);
  }

  @Patch('entries/:entryId/service')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async changeService(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body(new ZodPipe(changeServiceSchema)) body: ChangeServiceInput,
  ) {
    return this.queue.changeService(user.id, entryId, body);
  }

  @Post('entries/:entryId/undo-complete')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async undoComplete(
    @CurrentUser() user: RequestUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    const salonId = await resolveSalonId(this.prisma, entryId);
    return this.queue.undoComplete(user.id, salonId, entryId);
  }

  @Get(':salonId/announcements')
  @UseGuards(JwtAuthGuard)
  async announcements(
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ) {
    return this.queue.listAnnouncements(salonId);
  }

  @Post(':salonId/announcements')
  @UseGuards(JwtAuthGuard)
  async postAnnouncement(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body(new ZodPipe(announcementSchema)) body: AnnouncementInput,
  ) {
    return this.queue.postAnnouncement(salonId, user.id, body);
  }

  @Get(':salonId/search')
  @UseGuards(JwtAuthGuard)
  async searchQueue(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Query('q') q: string,
  ) {
    if (!q?.trim()) throw new BadRequestException('q is required');
    return this.queue.searchQueue(user.id, salonId, q.trim());
  }

  /** Owner: set or clear queue capacity limit. */
  @Patch(':salonId/capacity')
  @UseGuards(JwtAuthGuard)
  setCapacity(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body(new ZodPipe(setCapacitySchema)) body: SetCapacityInput,
  ) {
    return this.queue.setCapacity(user.id, salonId, body.maxCapacity);
  }

  /** Owner: configure no-show policy. */
  @Patch(':salonId/noshowpolicy')
  @UseGuards(JwtAuthGuard)
  setNoShowPolicy(
    @CurrentUser() user: RequestUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body(new ZodPipe(noShowPolicySchema)) body: NoShowPolicyInput,
  ) {
    return this.queue.setNoShowPolicy(user.id, salonId, body.policy, body.threshold);
  }
}
