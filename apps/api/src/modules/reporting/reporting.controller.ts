import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  adminSalonListQuerySchema,
  adminUpdateSalonStatusSchema,
  analyticsQuerySchema,
  type AdminSalonListQuery,
  type AdminUpdateSalonStatusInput,
  type AnalyticsQuery,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodPipe, ZodQueryPipe } from '../../common/validation/zod.pipe';
import { SalonAccessService } from '../salons/salon-access.service';
import { ReportingService, resolveDateRange } from './reporting.service';

function requireAdmin(user: RequestUser) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
}

// ── Admin analytics ────────────────────────────────────────────────────────

@Controller({ path: 'admin', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class AdminReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('analytics/overview')
  overview(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    requireAdmin(user);
    return this.reporting.adminOverview(resolveDateRange(q.preset, q.from, q.to));
  }

  @Get('analytics/queues')
  queues(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    requireAdmin(user);
    return this.reporting.queueAnalytics(null, resolveDateRange(q.preset, q.from, q.to));
  }

  @Get('analytics/appointments')
  appointments(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    requireAdmin(user);
    return this.reporting.appointmentAnalytics(null, resolveDateRange(q.preset, q.from, q.to));
  }

  // ── Salon directory ──────────────────────────────────────────────────────

  @Get('salons')
  listSalons(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(adminSalonListQuerySchema)) q: AdminSalonListQuery,
  ) {
    requireAdmin(user);
    return this.reporting.adminListSalons(q);
  }

  @Patch('salons/:id/status')
  updateSalonStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(adminUpdateSalonStatusSchema)) body: AdminUpdateSalonStatusInput,
  ) {
    requireAdmin(user);
    return this.reporting.adminUpdateSalonStatus(id, body.status, user.id, body.reason);
  }
}

// ── Salon-owner analytics ──────────────────────────────────────────────────

@Controller({ path: 'salons/:salonId/analytics', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class SalonReportingController {
  constructor(
    private readonly reporting: ReportingService,
    private readonly access: SalonAccessService,
  ) {}

  private async assertAccess(user: RequestUser, salonId: string) {
    const vis = await this.access.resolveVisibility(user, salonId);
    if (!vis.isMember) throw new ForbiddenException('Salon access required');
  }

  @Get('overview')
  async overview(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    await this.assertAccess(user, salonId);
    return this.reporting.salonOverview(salonId, resolveDateRange(q.preset, q.from, q.to));
  }

  @Get('queues')
  async queues(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    await this.assertAccess(user, salonId);
    return this.reporting.queueAnalytics(salonId, resolveDateRange(q.preset, q.from, q.to));
  }

  @Get('appointments')
  async appointments(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    await this.assertAccess(user, salonId);
    return this.reporting.appointmentAnalytics(salonId, resolveDateRange(q.preset, q.from, q.to));
  }

  @Get('services')
  async services(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    await this.assertAccess(user, salonId);
    return this.reporting.serviceAnalytics(salonId, resolveDateRange(q.preset, q.from, q.to));
  }

  @Get('customers')
  async customers(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    await this.assertAccess(user, salonId);
    return this.reporting.customerAnalytics(salonId, resolveDateRange(q.preset, q.from, q.to));
  }

  @Get('peak-hours')
  async peakHours(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(analyticsQuerySchema)) q: AnalyticsQuery,
  ) {
    await this.assertAccess(user, salonId);
    return this.reporting.peakHours(salonId, resolveDateRange(q.preset, q.from, q.to));
  }

  @Get('health')
  async health(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.assertAccess(user, salonId);
    return this.reporting.salonHealthScore(salonId);
  }
}
