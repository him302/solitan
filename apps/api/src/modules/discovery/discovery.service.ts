import { Injectable } from '@nestjs/common';
import type {
  DiscoveryPage,
  DiscoveryQuery,
  DiscoverySalonDto,
  MapMarkersResponse,
  MapQuery,
  RatingSummary,
  ServiceDto,
} from '@soliton/api-contract';
import { logger } from '../../common/logging/logger';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { computeOpenState, type HoursRow } from '../salons/open-state';
import { toPublicSalon, toRating, toServiceDto } from '../salons/salon-mapper';
import {
  buildDiscoveryQuery,
  buildMapQuery,
  resolveSort,
  type DiscoveryRow,
} from './discovery.sql';

const SERVICE_PREVIEW_COUNT = 3;

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * Public discovery of Soliton-connected (active) salons. Related data (hours, services,
   * ratings) is fetched in ONE batched query per kind for the whole page — no N+1.
   * Distance comes from PostGIS; the viewer's position is used for this request only
   * and is never stored.
   */
  async search(query: DiscoveryQuery): Promise<DiscoveryPage> {
    const sort = resolveSort(query);
    const rows = await this.prisma.$queryRaw<DiscoveryRow[]>(buildDiscoveryQuery(query, sort));

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const related = await this.loadRelated(page.map((row) => row.id));
    const now = new Date();

    const items: DiscoverySalonDto[] = page.map((row) => ({
      ...toPublicSalon({
        salon: row,
        location: { latitude: row.lat, longitude: row.lng },
        openState: computeOpenState(row.status, related.hours.get(row.id) ?? [], now),
        rating: related.ratings.get(row.id) ?? null,
        distanceMeters: row.distance_m,
      }),
      servicePreview: (related.services.get(row.id) ?? []).slice(0, SERVICE_PREVIEW_COUNT),
    }));

    this.analytics.track('search_performed', {
      hasQuery: Boolean(query.q), // never the raw text
      hasLocation: query.lat !== undefined,
      sort,
      resultCount: items.length,
      offset: query.offset,
    });
    logger.info(
      { event: 'discovery_search', sort, resultCount: items.length, offset: query.offset },
      'discovery_search',
    );

    return {
      items,
      page: {
        limit: query.limit,
        offset: query.offset,
        nextOffset: hasMore ? query.offset + query.limit : null,
      },
      appliedSort: sort,
    };
  }

  /** Bounded marker set for the map. Soliton-connected salons only. */
  async mapMarkers(query: MapQuery): Promise<MapMarkersResponse> {
    const rows = await this.prisma.$queryRaw<DiscoveryRow[]>(buildMapQuery(query));
    const hours = await this.loadHours(rows.map((row) => row.id));
    const now = new Date();
    return {
      markers: rows.map((row) => ({
        id: row.id,
        name: row.name,
        location: { latitude: row.lat, longitude: row.lng },
        distanceMeters: row.distance_m === null ? null : Math.round(row.distance_m),
        openState: computeOpenState(row.status, hours.get(row.id) ?? [], now),
      })),
    };
  }

  private async loadHours(salonIds: string[]): Promise<Map<string, HoursRow[]>> {
    const map = new Map<string, HoursRow[]>();
    if (salonIds.length === 0) return map;
    const rows = await this.prisma.operatingHours.findMany({
      where: { salonId: { in: salonIds } },
    });
    for (const row of rows) {
      const list = map.get(row.salonId) ?? [];
      list.push(row);
      map.set(row.salonId, list);
    }
    return map;
  }

  private async loadRelated(salonIds: string[]): Promise<{
    hours: Map<string, HoursRow[]>;
    services: Map<string, ServiceDto[]>;
    ratings: Map<string, RatingSummary | null>;
  }> {
    const services = new Map<string, ServiceDto[]>();
    const ratings = new Map<string, RatingSummary | null>();
    if (salonIds.length === 0) return { hours: new Map(), services, ratings };

    const [hours, serviceRows, ratingRows] = await Promise.all([
      this.loadHours(salonIds),
      this.prisma.service.findMany({
        where: { salonId: { in: salonIds }, active: true },
        orderBy: [{ salonId: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.review.groupBy({
        by: ['salonId'],
        where: { salonId: { in: salonIds } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    for (const row of serviceRows) {
      const list = services.get(row.salonId) ?? [];
      list.push(toServiceDto(row));
      services.set(row.salonId, list);
    }
    for (const row of ratingRows) {
      ratings.set(row.salonId, toRating(row._avg.rating, row._count._all));
    }
    return { hours, services, ratings };
  }
}
