import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AnalyticsDatePreset,
  AnalyticsPeriod,
  AdminSalonListDto,
  AdminSalonListQuery,
  AppointmentAnalyticsDto,
  CustomerAnalyticsDto,
  HealthComponent,
  HealthLabel,
  PeakHourItem,
  PeakHoursDto,
  PlatformOverviewDto,
  QueueAnalyticsDto,
  SalonHealthScoreDto,
  SalonOverviewDto,
  ServiceAnalyticsDto,
} from '@soliton/api-contract';
import { PrismaService } from '../prisma/prisma.service';

/** IST = UTC+5:30. All "today" calculations use this timezone. */
const SALON_TZ = 'Asia/Kolkata';

export interface DateRange {
  from: Date;
  to: Date;
}

/** Resolve a preset or from/to strings into a concrete DateRange (IST boundaries). */
export function resolveDateRange(
  preset?: AnalyticsDatePreset,
  from?: string,
  to?: string,
): DateRange {
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: SALON_TZ }));
  const startOfToday = new Date(nowIST);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(nowIST);
  endOfToday.setHours(23, 59, 59, 999);

  if (preset === 'today' || (!preset && !from && !to)) {
    return { from: toUtc(startOfToday), to: toUtc(endOfToday) };
  }
  if (preset === 'yesterday') {
    const s = new Date(startOfToday); s.setDate(s.getDate() - 1);
    const e = new Date(endOfToday);   e.setDate(e.getDate() - 1);
    return { from: toUtc(s), to: toUtc(e) };
  }
  if (preset === '7d') {
    const s = new Date(startOfToday); s.setDate(s.getDate() - 6);
    return { from: toUtc(s), to: toUtc(endOfToday) };
  }
  if (preset === '30d') {
    const s = new Date(startOfToday); s.setDate(s.getDate() - 29);
    return { from: toUtc(s), to: toUtc(endOfToday) };
  }
  // Custom from/to
  const f = from ? new Date(from) : toUtc(startOfToday);
  const t = to   ? new Date(to)   : toUtc(endOfToday);
  return { from: f, to: t };
}

/** Convert an IST wall-clock Date to a UTC Date (subtract 5h30m = 19800s). */
function toUtc(ist: Date): Date {
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000);
}

function period(range: DateRange): AnalyticsPeriod {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Platform overview ────────────────────────────────────────────────────

  async adminOverview(range: DateRange): Promise<PlatformOverviewDto> {
    const [salonCounts, customerCount, queueCounts, apptCounts, reviewAgg, complaintCount] =
      await Promise.all([
        this.prisma.salon.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.user.count({ where: { role: 'customer' } }),
        this.prisma.queueEntry.groupBy({
          by: ['state'],
          where: { createdAt: { gte: range.from, lte: range.to } },
          _count: { _all: true },
        }),
        this.prisma.appointment.groupBy({
          by: ['status'],
          where: { scheduledAt: { gte: range.from, lte: range.to } },
          _count: { _all: true },
        }),
        this.prisma.review.aggregate({
          where: { createdAt: { gte: range.from, lte: range.to } },
          _count: { _all: true },
          _avg: { rating: true },
        }),
        this.prisma.complaint.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        }),
      ]);

    const byStatus = Object.fromEntries(salonCounts.map((s) => [s.status, s._count._all]));
    const byState  = Object.fromEntries(queueCounts.map((q) => [q.state, q._count._all]));
    const byAppt   = Object.fromEntries(apptCounts.map((a)  => [a.status, a._count._all]));

    return {
      period: period(range),
      salons: {
        total: salonCounts.reduce((s, c) => s + c._count._all, 0),
        active: byStatus['active']    ?? 0,
        pending: byStatus['pending']  ?? 0,
        suspended: byStatus['suspended'] ?? 0,
      },
      customers: customerCount,
      queueEntries: queueCounts.reduce((s, c) => s + c._count._all, 0),
      queueCompleted: byState['completed'] ?? 0,
      appointments: apptCounts.reduce((s, c) => s + c._count._all, 0),
      appointmentsCompleted: byAppt['completed'] ?? 0,
      reviews: reviewAgg._count._all,
      averageRating: reviewAgg._avg.rating ?? null,
      complaints: complaintCount,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Queue analytics ──────────────────────────────────────────────────────

  async queueAnalytics(salonId: string | null, range: DateRange): Promise<QueueAnalyticsDto> {
    const where = {
      ...(salonId ? { salonId } : {}),
      createdAt: { gte: range.from, lte: range.to },
    };

    const [byState, waitTimes] = await Promise.all([
      this.prisma.queueEntry.groupBy({ by: ['state'], where, _count: { _all: true } }),
      this.prisma.$queryRaw<[{ avg_wait: number | null; max_wait: number | null }]>`
        SELECT
          ROUND(AVG(EXTRACT(EPOCH FROM ("startedAt" - "createdAt")) / 60.0)::numeric, 1)::float AS avg_wait,
          ROUND(MAX(EXTRACT(EPOCH FROM ("startedAt" - "createdAt")) / 60.0)::numeric, 1)::float AS max_wait
        FROM queue_entries
        WHERE state = 'completed'
          AND "startedAt" IS NOT NULL
          AND "createdAt" >= ${range.from}
          AND "createdAt" <= ${range.to}
          ${salonId ? Prisma.sql`AND "salonId" = ${salonId}::uuid` : Prisma.sql``}
      `,
    ]);

    const byS     = Object.fromEntries(byState.map((q) => [q.state, q._count._all]));
    const total   = byState.reduce((s, c) => s + c._count._all, 0);
    const completed = byS['completed'] ?? 0;
    const cancelled = (byS['cancelled'] ?? 0) + (byS['bumped'] ?? 0);
    const noShows   = byS['no_show'] ?? 0;

    return {
      period: period(range),
      totalEntries: total,
      completed,
      cancelled,
      noShows,
      abandonmentRate: rate(cancelled + noShows, total),
      avgWaitMinutes: waitTimes[0]?.avg_wait ?? null,
      maxWaitMinutes: waitTimes[0]?.max_wait ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Appointment analytics ────────────────────────────────────────────────

  async appointmentAnalytics(
    salonId: string | null,
    range: DateRange,
  ): Promise<AppointmentAnalyticsDto> {
    const where = {
      ...(salonId ? { salonId } : {}),
      scheduledAt: { gte: range.from, lte: range.to },
    };

    const byStatus = await this.prisma.appointment.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const byS       = Object.fromEntries(byStatus.map((a) => [a.status, a._count._all]));
    const total     = byStatus.reduce((s, c) => s + c._count._all, 0);
    const completed = byS['completed'] ?? 0;
    const cancelled = byS['cancelled'] ?? 0;
    const noShows   = byS['no_show']   ?? 0;

    return {
      period: period(range),
      total,
      completed,
      cancelled,
      noShows,
      completionRate:    rate(completed, total),
      cancellationRate:  rate(cancelled, total),
      noShowRate:        rate(noShows, total),
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Service analytics (per salon) ────────────────────────────────────────

  async serviceAnalytics(salonId: string, range: DateRange): Promise<ServiceAnalyticsDto> {
    const [services, queueGroups, apptGroups] = await Promise.all([
      this.prisma.service.findMany({
        where: { salonId },
        select: { id: true, name: true },
      }),
      this.prisma.queueEntry.groupBy({
        by: ['serviceId', 'state'],
        where: { salonId, createdAt: { gte: range.from, lte: range.to } },
        _count: { _all: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['serviceId', 'status'],
        where: { salonId, scheduledAt: { gte: range.from, lte: range.to } },
        _count: { _all: true },
      }),
    ]);

    const svcMap = new Map(services.map((s) => [s.id, s.name]));

    // Accumulate per service
    const stats = new Map<string, { queueEntries: number; appointments: number; completed: number }>();

    for (const g of queueGroups) {
      const cur = stats.get(g.serviceId) ?? { queueEntries: 0, appointments: 0, completed: 0 };
      cur.queueEntries += g._count._all;
      if (g.state === 'completed') cur.completed += g._count._all;
      stats.set(g.serviceId, cur);
    }
    for (const g of apptGroups) {
      const cur = stats.get(g.serviceId) ?? { queueEntries: 0, appointments: 0, completed: 0 };
      cur.appointments += g._count._all;
      if (g.status === 'completed') cur.completed += g._count._all;
      stats.set(g.serviceId, cur);
    }

    const items = [...stats.entries()]
      .map(([serviceId, s]) => ({
        serviceId,
        serviceName: svcMap.get(serviceId) ?? 'Unknown',
        ...s,
      }))
      .sort((a, b) => b.queueEntries + b.appointments - (a.queueEntries + a.appointments));

    return { period: period(range), items, generatedAt: new Date().toISOString() };
  }

  // ── Customer analytics (per salon) ───────────────────────────────────────

  async customerAnalytics(salonId: string, range: DateRange): Promise<CustomerAnalyticsDto> {
    // Customers with a completed queue entry in the period
    const servedInPeriod = await this.prisma.queueEntry.findMany({
      where: {
        salonId,
        state: 'completed',
        createdAt: { gte: range.from, lte: range.to },
        customerId: { not: null },
      },
      select: { customerId: true },
      distinct: ['customerId'],
    });

    const totalServed = servedInPeriod.length;
    if (totalServed === 0) {
      return {
        period: period(range),
        totalServed: 0,
        newCustomers: 0,
        returningCustomers: 0,
        repeatVisitRate: null,
        generatedAt: new Date().toISOString(),
      };
    }

    const customerIds = servedInPeriod
      .map((e) => e.customerId)
      .filter((id): id is string => id !== null);

    // New: no prior completed entry at this salon before period start
    const priorVisitors = await this.prisma.queueEntry.findMany({
      where: {
        salonId,
        state: 'completed',
        createdAt: { lt: range.from },
        customerId: { in: customerIds },
      },
      select: { customerId: true },
      distinct: ['customerId'],
    });

    const priorSet = new Set(priorVisitors.map((e) => e.customerId));
    const newCustomers = customerIds.filter((id) => !priorSet.has(id)).length;
    const returningCustomers = totalServed - newCustomers;

    return {
      period: period(range),
      totalServed,
      newCustomers,
      returningCustomers,
      repeatVisitRate: rate(returningCustomers, totalServed),
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Peak hours ───────────────────────────────────────────────────────────

  async peakHours(salonId: string, range: DateRange): Promise<PeakHoursDto> {
    type Row = { weekday: number; hour: number; count: bigint | number };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        EXTRACT(DOW FROM "createdAt" AT TIME ZONE 'Asia/Kolkata')::int  AS weekday,
        EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Kolkata')::int AS hour,
        COUNT(*)::int AS count
      FROM queue_entries
      WHERE "salonId" = ${salonId}::uuid
        AND "createdAt" >= ${range.from}
        AND "createdAt" <= ${range.to}
      GROUP BY weekday, hour
      ORDER BY count DESC
    `;

    const items: PeakHourItem[] = rows.map((r) => ({
      weekday: Number(r.weekday),
      hour: Number(r.hour),
      count: Number(r.count),
    }));

    return {
      period: period(range),
      items,
      timezone: SALON_TZ,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Salon overview (owner mobile) ────────────────────────────────────────

  async salonOverview(salonId: string, range: DateRange): Promise<SalonOverviewDto> {
    const [currentQueue, queueCounts, apptCount, waitTimes, salon] = await Promise.all([
      // Live queue size
      this.prisma.queueEntry.count({
        where: { salonId, state: { in: ['waiting', 'notified', 'checked_in', 'in_service'] } },
      }),
      // Today's queue by state
      this.prisma.queueEntry.groupBy({
        by: ['state'],
        where: { salonId, createdAt: { gte: range.from, lte: range.to } },
        _count: { _all: true },
      }),
      // Today's appointments
      this.prisma.appointment.count({
        where: { salonId, scheduledAt: { gte: range.from, lte: range.to } },
      }),
      // Avg wait today
      this.prisma.$queryRaw<[{ avg_wait: number | null }]>`
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM ("startedAt" - "createdAt")) / 60.0)::numeric, 1)::float AS avg_wait
        FROM queue_entries
        WHERE "salonId" = ${salonId}::uuid
          AND state = 'completed'
          AND "startedAt" IS NOT NULL
          AND "createdAt" >= ${range.from}
          AND "createdAt" <= ${range.to}
      `,
      this.prisma.salon.findUnique({
        where: { id: salonId },
        select: { averageRating: true, reviewCount: true },
      }),
    ]);

    const byState = Object.fromEntries(queueCounts.map((q) => [q.state, q._count._all]));
    const totalToday = queueCounts.reduce((s, c) => s + c._count._all, 0);

    return {
      salonId,
      period: period(range),
      currentQueueSize: currentQueue,
      todayQueueEntries: totalToday,
      todayCompleted: byState['completed'] ?? 0,
      todayAppointments: apptCount,
      avgWaitMinutes: waitTimes[0]?.avg_wait ?? null,
      averageRating: salon?.averageRating ?? null,
      reviewCount: salon?.reviewCount ?? 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Salon health score ───────────────────────────────────────────────────

  async salonHealthScore(salonId: string): Promise<SalonHealthScoreDto> {
    const to   = new Date();
    const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const MIN_DATA = 5;

    const [queueGroups, apptGroups, salon, complaintCount] = await Promise.all([
      this.prisma.queueEntry.groupBy({
        by: ['state'],
        where: { salonId, createdAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { salonId, scheduledAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      this.prisma.salon.findUnique({
        where: { id: salonId },
        select: { averageRating: true, reviewCount: true },
      }),
      this.prisma.complaint.count({
        where: { salonId, createdAt: { gte: from, lte: to } },
      }),
    ]);

    const qByState = Object.fromEntries(queueGroups.map((q) => [q.state, q._count._all]));
    const aByStatus = Object.fromEntries(apptGroups.map((a) => [a.status, a._count._all]));
    const totalQueue = queueGroups.reduce((s, c) => s + c._count._all, 0);
    const totalAppt  = apptGroups.reduce((s, c) => s + c._count._all, 0);

    const insufficient: SalonHealthScoreDto = {
      salonId,
      score: null,
      label: 'insufficient_data',
      components: {
        queueCompletion:      { score: 0, label: 'Insufficient data', value: null, detail: 'Need at least 5 visits' },
        appointmentCompletion:{ score: 0, label: 'Insufficient data', value: null, detail: 'Need at least 5 appointments' },
        noShowRate:           { score: 0, label: 'Insufficient data', value: null, detail: '' },
        averageRating:        { score: 0, label: 'Insufficient data', value: null, detail: '' },
        complaintRate:        { score: 0, label: 'Insufficient data', value: null, detail: '' },
      },
      generatedAt: new Date().toISOString(),
    };

    if (totalQueue < MIN_DATA) return insufficient;

    // Queue completion (0–20)
    const qCompleted = qByState['completed'] ?? 0;
    const qCompRate  = totalQueue > 0 ? qCompleted / totalQueue : 0;
    const qScore     = Math.round(qCompRate * 20);
    const qComp: HealthComponent = {
      score: qScore,
      value: Math.round(qCompRate * 100),
      label: qCompRate >= 0.90 ? 'Excellent' : qCompRate >= 0.75 ? 'Good' : qCompRate >= 0.60 ? 'Fair' : 'Needs attention',
      detail: `${Math.round(qCompRate * 100)}% queue completion rate`,
    };

    // Appointment completion (0–20)
    const aCompleted = aByStatus['completed'] ?? 0;
    const aCompRate  = totalAppt > 0 ? aCompleted / totalAppt : null;
    const aScore     = aCompRate !== null ? Math.round(aCompRate * 20) : 10;
    const aComp: HealthComponent = {
      score: aScore,
      value: aCompRate !== null ? Math.round(aCompRate * 100) : null,
      label: aCompRate === null ? 'No appointment data' : aCompRate >= 0.85 ? 'Excellent' : aCompRate >= 0.70 ? 'Good' : 'Needs attention',
      detail: aCompRate !== null ? `${Math.round(aCompRate * 100)}% appointment completion` : 'No appointments in period',
    };

    // No-show rate (0–20); combines queue + appointment no-shows
    const qNoShows  = qByState['no_show'] ?? 0;
    const aNoShows  = aByStatus['no_show'] ?? 0;
    const totalOps  = totalQueue + totalAppt;
    const noShowRate = totalOps > 0 ? (qNoShows + aNoShows) / totalOps : 0;
    const nsScore    = Math.round((1 - Math.min(noShowRate, 1)) * 20);
    const nsComp: HealthComponent = {
      score: nsScore,
      value: Math.round(noShowRate * 100),
      label: noShowRate < 0.05 ? 'Excellent' : noShowRate < 0.10 ? 'Good' : noShowRate < 0.20 ? 'Fair' : 'Needs attention',
      detail: `${Math.round(noShowRate * 100)}% no-show rate`,
    };

    // Rating (0–20)
    const avgRating = salon?.averageRating ?? null;
    const rScore    = avgRating !== null ? Math.round((avgRating / 5) * 20) : 10;
    const rComp: HealthComponent = {
      score: rScore,
      value: avgRating,
      label: avgRating === null ? 'No ratings yet' : avgRating >= 4.5 ? 'Excellent' : avgRating >= 4.0 ? 'Good' : avgRating >= 3.0 ? 'Fair' : 'Needs attention',
      detail: avgRating !== null ? `${avgRating.toFixed(1)} average rating (${salon?.reviewCount ?? 0} reviews)` : 'No reviews yet',
    };

    // Complaint rate (0–20)
    const cRate  = totalQueue > 0 ? complaintCount / totalQueue : 0;
    const cScore = cRate < 0.02 ? 20 : cRate < 0.05 ? 15 : cRate < 0.10 ? 10 : cRate < 0.20 ? 5 : 0;
    const cComp: HealthComponent = {
      score: cScore,
      value: Math.round(cRate * 100),
      label: cRate < 0.02 ? 'Excellent' : cRate < 0.05 ? 'Good' : cRate < 0.10 ? 'Fair' : 'Needs attention',
      detail: `${complaintCount} complaint${complaintCount !== 1 ? 's' : ''} in 90 days`,
    };

    const totalScore = qScore + aScore + nsScore + rScore + cScore;
    const label: HealthLabel = totalScore >= 90 ? 'excellent' : totalScore >= 70 ? 'good' : totalScore >= 50 ? 'fair' : 'needs_attention';

    return {
      salonId,
      score: totalScore,
      label,
      components: {
        queueCompletion:       qComp,
        appointmentCompletion: aComp,
        noShowRate:            nsComp,
        averageRating:         rComp,
        complaintRate:         cComp,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Admin salon list ─────────────────────────────────────────────────────

  async adminListSalons(query: AdminSalonListQuery): Promise<AdminSalonListDto> {
    const where: Prisma.SalonWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { owner: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, salons] = await Promise.all([
      this.prisma.salon.count({ where }),
      this.prisma.salon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
        select: {
          id: true,
          name: true,
          status: true,
          city: true,
          queueStatus: true,
          averageRating: true,
          reviewCount: true,
          createdAt: true,
          owner: { select: { name: true, email: true } },
          _count: { select: { services: { where: { active: true } } } },
        },
      }),
    ]);

    return {
      items: salons.map((s) => ({
        id: s.id,
        name: s.name,
        ownerName: s.owner.name,
        ownerEmail: s.owner.email,
        status: s.status,
        city: s.city,
        queueStatus: s.queueStatus,
        averageRating: s.averageRating,
        reviewCount: s.reviewCount,
        serviceCount: s._count.services,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      offset: query.offset,
      limit: query.limit,
    };
  }

  // ── Admin: update salon status ────────────────────────────────────────────

  async adminUpdateSalonStatus(
    salonId: string,
    status: 'active' | 'suspended',
    actorId: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.salon.update({ where: { id: salonId }, data: { status } });
      await tx.platformAudit.create({
        data: {
          actorId,
          action: `salon.${status}`,
          entityType: 'salon',
          entityId: salonId,
          metadata: reason ? { reason } : undefined,
        },
      });
    });
  }
}
