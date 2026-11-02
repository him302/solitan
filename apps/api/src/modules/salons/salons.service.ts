import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  BufferConfig,
  CreateSalonInput,
  Location,
  MySalonDto,
  OperatingHoursDto,
  PutHoursInput,
  SalonDetailDto,
  UpdateSalonInput,
} from '@soliton/api-contract';
import { logger } from '../../common/logging/logger';
import { salonAlreadyExists, salonNotFound } from '../../common/errors/domain.exception';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { SalonAccessService } from './salon-access.service';
import { readSalonGeo, setSalonLocation } from './salon-geo';
import { computeOpenState, toHoursDto } from './open-state';
import { toPublicSalon, toRating, toServiceDto } from './salon-mapper';

@Injectable()
export class SalonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SalonAccessService,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * Creates a salon owned by the authenticated owner. Everything happens in ONE
   * transaction so INV-OWNER can never be half-applied:
   *   salon(pending, queue closed) + PostGIS point + SalonStaff(owner, active) + queue row.
   * The queue row is only a foundation row; no queue behaviour exists in Phase 1.
   */
  async create(user: RequestUser, input: CreateSalonInput): Promise<MySalonDto> {
    // Phase 1 is one salon per owner account (matches the singular GET /me/salon).
    const existing = await this.prisma.salon.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });
    if (existing) throw salonAlreadyExists();

    const salonId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.salon.create({
        data: {
          ownerId: user.id, // always the authenticated user — never client-supplied
          name: input.name,
          address: input.address,
          city: input.city,
          photoUrl: input.photoUrl,
          bufferConfig: input.bufferConfig as Prisma.InputJsonValue | undefined,
          status: 'pending', // owners cannot self-activate; admin verification comes later
          queueStatus: 'closed',
        },
        select: { id: true },
      });
      await setSalonLocation(tx, created.id, {
        latitude: input.latitude,
        longitude: input.longitude,
      });
      await tx.salonStaff.create({
        data: { salonId: created.id, userId: user.id, role: 'owner', active: true },
      });
      await tx.queue.create({ data: { salonId: created.id, status: 'closed' } });
      return created.id;
    });

    logger.info({ event: 'salon_created', salonId, userId: user.id }, 'salon_created');
    return this.loadMySalon(salonId, 'owner');
  }

  /** Public detail. Non-active salons are visible only to admin and their own members. */
  async getDetail(
    viewer: RequestUser | undefined,
    salonId: string,
    viewerLocation?: Location,
  ): Promise<SalonDetailDto> {
    await this.access.resolveVisibility(viewer, salonId);

    const [salon, geo, hourRows, services, rating] = await Promise.all([
      this.prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true, name: true, photoUrl: true, address: true, city: true, status: true },
      }),
      readSalonGeo(this.prisma, salonId, viewerLocation),
      this.prisma.operatingHours.findMany({ where: { salonId } }),
      this.prisma.service.findMany({
        where: { salonId, active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.review.aggregate({
        where: { salonId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    if (!salon || geo?.lat == null || geo.lng == null) throw salonNotFound();

    this.analytics.track('salon_viewed', { hasLocation: viewerLocation !== undefined });
    return {
      ...toPublicSalon({
        salon,
        location: { latitude: geo.lat, longitude: geo.lng },
        openState: computeOpenState(salon.status, hourRows),
        rating: toRating(rating._avg.rating, rating._count._all),
        distanceMeters: geo.distance_m,
      }),
      hours: toHoursDto(hourRows),
      services: services.map(toServiceDto),
    };
  }

  /** Owner-only profile/location update. status, ownerId and queueStatus are not accepted. */
  async update(user: RequestUser, salonId: string, input: UpdateSalonInput): Promise<MySalonDto> {
    await this.access.assertManager(user, salonId);

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.SalonUpdateInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.address !== undefined) data.address = input.address;
      if (input.city !== undefined) data.city = input.city;
      if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl;
      if (input.bufferConfig !== undefined) {
        data.bufferConfig =
          input.bufferConfig === null
            ? Prisma.JsonNull
            : (input.bufferConfig as Prisma.InputJsonValue);
      }
      if (Object.keys(data).length > 0) {
        await tx.salon.update({ where: { id: salonId }, data });
      }
      if (input.latitude !== undefined && input.longitude !== undefined) {
        await setSalonLocation(tx, salonId, {
          latitude: input.latitude,
          longitude: input.longitude,
        });
      }
    });

    logger.info(
      { event: 'salon_updated', salonId, userId: user.id, fields: Object.keys(input) },
      'salon_updated',
    );
    return this.loadMySalon(salonId, user.role === 'admin' ? 'admin' : 'owner');
  }

  async getHours(viewer: RequestUser | undefined, salonId: string): Promise<OperatingHoursDto> {
    await this.access.resolveVisibility(viewer, salonId);
    return toHoursDto(await this.prisma.operatingHours.findMany({ where: { salonId } }));
  }

  /** Full replacement of the week. Closed days are stored as the absence of a row. */
  async putHours(
    user: RequestUser,
    salonId: string,
    input: PutHoursInput,
  ): Promise<OperatingHoursDto> {
    await this.access.assertManager(user, salonId);

    const rows = input.days
      .filter((day) => day.isOpen)
      .map((day) => ({
        salonId,
        weekday: day.weekday,
        openTime: day.openTime as string,
        closeTime: day.closeTime as string,
      }));

    await this.prisma.$transaction(async (tx) => {
      await tx.operatingHours.deleteMany({ where: { salonId } });
      if (rows.length > 0) await tx.operatingHours.createMany({ data: rows });
    });

    logger.info(
      { event: 'salon_updated', salonId, userId: user.id, fields: ['hours'] },
      'salon_updated',
    );
    return toHoursDto(rows);
  }

  /** The signed-in user's own salon: their active owner/staff membership. */
  async getMine(user: RequestUser): Promise<MySalonDto> {
    const membership = await this.prisma.salonStaff.findFirst({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: 'asc' },
      select: { salonId: true, role: true },
    });
    if (!membership) throw salonNotFound();
    return this.loadMySalon(membership.salonId, membership.role);
  }

  private async loadMySalon(
    salonId: string,
    viewerRole: MySalonDto['viewerRole'],
  ): Promise<MySalonDto> {
    const [salon, geo, hourRows, rating] = await Promise.all([
      this.prisma.salon.findUnique({ where: { id: salonId } }),
      readSalonGeo(this.prisma, salonId),
      this.prisma.operatingHours.findMany({ where: { salonId } }),
      this.prisma.review.aggregate({
        where: { salonId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    if (!salon || geo?.lat == null || geo.lng == null) throw salonNotFound();

    return {
      ...toPublicSalon({
        salon,
        location: { latitude: geo.lat, longitude: geo.lng },
        openState: computeOpenState(salon.status, hourRows),
        rating: toRating(rating._avg.rating, rating._count._all),
        distanceMeters: null,
      }),
      viewerRole,
      queueStatus: salon.queueStatus,
      bufferConfig: (salon.bufferConfig as BufferConfig | null) ?? null,
      hoursConfigured: hourRows.length > 0,
    };
  }
}
