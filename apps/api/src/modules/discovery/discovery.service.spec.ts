import { discoveryQuerySchema } from '@soliton/api-contract';
import { asPrisma, createPrismaMock, type PrismaMock } from '../../../test/support/prisma-mock';
import type { AnalyticsService } from '../analytics/analytics.service';
import { DiscoveryService } from './discovery.service';

const row = (n: number, overrides: Record<string, unknown> = {}) => ({
  id: `salon-${n}`,
  name: `Salon ${n}`,
  photoUrl: null,
  address: 'MG Road',
  city: 'Raipur',
  status: 'active',
  lat: 21.25 + n / 1000,
  lng: 81.63,
  distance_m: n * 500.4,
  ...overrides,
});

const svc = (salonId: string, n: number, active = true) => ({
  id: `svc-${salonId}-${n}`,
  salonId,
  name: `Service ${n}`,
  priceCents: 10000 * n,
  estimatedMinutes: 15 * n,
  active,
});

function build(): { service: DiscoveryService; prisma: PrismaMock; track: jest.Mock } {
  const prisma = createPrismaMock();
  prisma.service.findMany.mockResolvedValue([]);
  const track = jest.fn();
  const service = new DiscoveryService(asPrisma(prisma), { track } as unknown as AnalyticsService);
  return { service, prisma, track };
}

const q = (raw: Record<string, unknown> = {}) => discoveryQuerySchema.parse(raw);

describe('DiscoveryService.search', () => {
  it('paginates: returns `limit` items and a nextOffset when more exist', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([row(1), row(2), row(3)]); // limit 2 → fetched 3
    const page = await service.search(q({ limit: '2', offset: '4' }));
    expect(page.items).toHaveLength(2);
    expect(page.page).toEqual({ limit: 2, offset: 4, nextOffset: 6 });
  });

  it('has no nextOffset on the last page', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([row(1), row(2)]);
    const page = await service.search(q({ limit: '5' }));
    expect(page.page.nextOffset).toBeNull();
  });

  it('batches related data: one query per kind regardless of page size (no N+1)', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([row(1), row(2), row(3), row(4)]);
    await service.search(q());
    expect(prisma.operatingHours.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.service.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.review.groupBy).toHaveBeenCalledTimes(1);
  });

  it('skips related queries entirely for an empty page', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([]);
    const page = await service.search(q());
    expect(page.items).toEqual([]);
    expect(prisma.service.findMany).not.toHaveBeenCalled();
  });

  it('attaches at most 3 active services as a preview, per salon', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([row(1), row(2)]);
    prisma.service.findMany.mockResolvedValue([
      ...[1, 2, 3, 4, 5].map((n) => svc('salon-1', n)),
      svc('salon-2', 1),
    ]);
    const page = await service.search(q());
    expect(page.items[0]?.servicePreview).toHaveLength(3);
    expect(page.items[1]?.servicePreview).toHaveLength(1);
    // only active services are even requested
    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ active: true }) }),
    );
  });

  it('never fabricates queue data: every card says the live queue is unavailable', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([row(1)]);
    const [item] = (await service.search(q())).items;
    expect(item?.liveQueue).toEqual({ available: false });
    expect(JSON.stringify(item)).not.toMatch(/eta|position|token|waiting|chair|staff/i);
  });

  it('does not invent ratings: null when there are no reviews, rounded when there are', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([row(1), row(2)]);
    prisma.review.groupBy.mockResolvedValue([
      { salonId: 'salon-2', _avg: { rating: 4.26 }, _count: { _all: 12 } },
    ]);
    const items = (await service.search(q())).items;
    expect(items[0]?.rating).toBeNull();
    expect(items[1]?.rating).toEqual({ average: 4.3, count: 12 });
  });

  it('rounds the PostGIS distance to whole metres and reports null without a viewer location', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([
      row(1, { distance_m: 1234.6 }),
      row(2, { distance_m: null }),
    ]);
    const items = (await service.search(q({ lat: '21.2', lng: '81.6' }))).items;
    expect(items[0]?.distanceMeters).toBe(1235);
    expect(items[1]?.distanceMeters).toBeNull();
  });

  it('reports the sort actually applied', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([]);
    expect((await service.search(q({ sort: 'nearest' }))).appliedSort).toBe('name'); // no coords
    expect((await service.search(q({ lat: '21', lng: '81' }))).appliedSort).toBe('nearest');
  });

  it('marks a salon "unconfigured" when it has no hours (never open by default)', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([row(1)]);
    expect((await service.search(q())).items[0]?.openState).toBe('unconfigured');
  });

  it('tracks a non-personal search event (no raw query text)', async () => {
    const { service, prisma, track } = build();
    prisma.$queryRaw.mockResolvedValue([row(1)]);
    await service.search(q({ q: 'my secret search' }));
    expect(track).toHaveBeenCalledWith(
      'search_performed',
      expect.objectContaining({ hasQuery: true, resultCount: 1 }),
    );
    expect(JSON.stringify(track.mock.calls)).not.toContain('my secret search');
  });
});

describe('DiscoveryService.mapMarkers', () => {
  it('returns minimal Soliton markers with open state', async () => {
    const { service, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([row(1)]);
    const { markers } = await service.mapMarkers({
      lat: 21.25,
      lng: 81.63,
      radiusKm: 10,
      limit: 50,
    });
    expect(markers).toEqual([
      {
        id: 'salon-1',
        name: 'Salon 1',
        location: { latitude: 21.251, longitude: 81.63 },
        distanceMeters: 500,
        openState: 'unconfigured',
      },
    ]);
  });
});
