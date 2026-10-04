import type { CreateSalonInput, PutHoursInput } from '@soliton/api-contract';
import {
  ADMIN,
  CUSTOMER,
  OWNER,
  SALON_ID,
  STAFF,
  asPrisma,
  createPrismaMock,
  salonRecord,
  type PrismaMock,
} from '../../../test/support/prisma-mock';
import type { AnalyticsService } from '../analytics/analytics.service';
import { SalonAccessService } from './salon-access.service';
import { SalonsService } from './salons.service';

const RAIPUR = { lat: 21.2514, lng: 81.6296 };

const createInput: CreateSalonInput = {
  name: 'Glow Salon',
  address: 'MG Road, Raipur',
  city: 'Raipur',
  latitude: RAIPUR.lat,
  longitude: RAIPUR.lng,
};

function build(): { service: SalonsService; prisma: PrismaMock; track: jest.Mock } {
  const prisma = createPrismaMock();
  const track = jest.fn();
  const access = new SalonAccessService(asPrisma(prisma));
  const service = new SalonsService(asPrisma(prisma), access, {
    track,
  } as unknown as AnalyticsService);
  return { service, prisma, track };
}

/** Wires the reads that loadMySalon / getDetail perform after a write. */
function stubSalonReads(prisma: PrismaMock, overrides: Record<string, unknown> = {}): void {
  prisma.salon.findUnique.mockResolvedValue(salonRecord(overrides));
  prisma.$queryRaw.mockResolvedValue([{ lat: RAIPUR.lat, lng: RAIPUR.lng, distance_m: null }]);
}

describe('SalonsService.create (1A)', () => {
  it('creates salon + owner staff + queue row in one transaction, preserving INV-OWNER', async () => {
    const { service, prisma } = build();
    prisma.salon.findFirst.mockResolvedValue(null);
    prisma.salon.create.mockResolvedValue({ id: SALON_ID });
    stubSalonReads(prisma, { status: 'pending' });

    const result = await service.create(OWNER, createInput);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const createArgs = prisma.salon.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createArgs.data).toMatchObject({
      ownerId: OWNER.id,
      status: 'pending',
      queueStatus: 'closed',
    });
    // INV-OWNER: the owner gets an ACTIVE owner SalonStaff row for this salon.
    expect(prisma.salonStaff.create).toHaveBeenCalledWith({
      data: { salonId: SALON_ID, userId: OWNER.id, role: 'owner', active: true },
    });
    expect(prisma.queue.create).toHaveBeenCalledWith({
      data: { salonId: SALON_ID, status: 'closed' },
    });

    expect(result.status).toBe('pending');
    expect(result.queueStatus).toBe('closed');
    expect(result.viewerRole).toBe('owner');
    expect(result.openState).toBe('closed');
    expect(result.hoursConfigured).toBe(false);
    expect(result.liveQueue).toEqual({ available: false });
  });

  it('writes the PostGIS point as (longitude, latitude)', async () => {
    const { service, prisma } = build();
    prisma.salon.findFirst.mockResolvedValue(null);
    prisma.salon.create.mockResolvedValue({ id: SALON_ID });
    stubSalonReads(prisma);

    await service.create(OWNER, createInput);

    const [, x, y, id] = prisma.$executeRaw.mock.calls[0] as unknown[];
    expect(x).toBe(RAIPUR.lng); // X = longitude
    expect(y).toBe(RAIPUR.lat); // Y = latitude
    expect(id).toBe(SALON_ID);
  });

  it('rejects a second salon for the same owner without writing anything', async () => {
    const { service, prisma } = build();
    prisma.salon.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(service.create(OWNER, createInput)).rejects.toMatchObject({
      code: 'SALON_ALREADY_EXISTS',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.salon.create).not.toHaveBeenCalled();
  });

  it('propagates a mid-transaction failure instead of reporting success', async () => {
    const { service, prisma } = build();
    prisma.salon.findFirst.mockResolvedValue(null);
    prisma.salon.create.mockResolvedValue({ id: SALON_ID });
    prisma.salonStaff.create.mockRejectedValue(new Error('db down'));

    await expect(service.create(OWNER, createInput)).rejects.toThrow('db down');
  });
});

describe('SalonsService.getDetail (public vs private shaping, visibility)', () => {
  it('returns only the allow-listed public fields for an active salon', async () => {
    const { service, prisma, track } = build();
    stubSalonReads(prisma);
    prisma.service.findMany.mockResolvedValue([
      {
        id: 's1',
        salonId: SALON_ID,
        name: 'Haircut',
        priceCents: 20000,
        estimatedMinutes: 30,
        active: true,
      },
    ]);

    const detail = await service.getDetail(undefined, SALON_ID);

    expect(Object.keys(detail).sort()).toEqual(
      [
        'address',
        'city',
        'distanceMeters',
        'hours',
        'id',
        'liveQueue',
        'location',
        'name',
        'openState',
        'photoUrl',
        'rating',
        'services',
        'status',
      ].sort(),
    );
    expect(JSON.stringify(detail)).not.toMatch(
      /ownerId|queueStatus|bufferConfig|passwordHash|refresh/i,
    );
    expect(detail.services[0]).toMatchObject({
      priceCents: 20000,
      currency: 'INR',
      estimatedMinutes: 30,
    });
    expect(detail.distanceMeters).toBeNull();
    expect(track).toHaveBeenCalledWith('salon_viewed', expect.any(Object));
  });

  it('reports "unconfigured" (not open) when the salon has no hours', async () => {
    const { service, prisma } = build();
    stubSalonReads(prisma);
    prisma.service.findMany.mockResolvedValue([]);
    const detail = await service.getDetail(undefined, SALON_ID);
    expect(detail.openState).toBe('unconfigured');
    expect(detail.hours.configured).toBe(false);
  });

  it('hides a pending salon from anonymous users and customers (404, no existence leak)', async () => {
    const { service, prisma } = build();
    stubSalonReads(prisma, { status: 'pending' });
    prisma.salonStaff.findFirst.mockResolvedValue(null);

    await expect(service.getDetail(undefined, SALON_ID)).rejects.toMatchObject({
      code: 'SALON_NOT_FOUND',
    });
    await expect(service.getDetail(CUSTOMER, SALON_ID)).rejects.toMatchObject({
      code: 'SALON_NOT_FOUND',
    });
  });

  it("lets the salon's own member and admin see a pending salon", async () => {
    const { service, prisma } = build();
    stubSalonReads(prisma, { status: 'pending' });
    prisma.service.findMany.mockResolvedValue([]);
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });

    await expect(service.getDetail(OWNER, SALON_ID)).resolves.toMatchObject({ status: 'pending' });
    await expect(service.getDetail(ADMIN, SALON_ID)).resolves.toMatchObject({ status: 'pending' });
  });

  it('returns a rounded PostGIS distance only when viewer coordinates are supplied', async () => {
    const { service, prisma } = build();
    prisma.salon.findUnique.mockResolvedValue(salonRecord());
    prisma.$queryRaw.mockResolvedValue([{ lat: RAIPUR.lat, lng: RAIPUR.lng, distance_m: 1234.56 }]);
    prisma.service.findMany.mockResolvedValue([]);

    const detail = await service.getDetail(undefined, SALON_ID, {
      latitude: 21.26,
      longitude: 81.64,
    });
    expect(detail.distanceMeters).toBe(1235);
  });
});

describe('SalonsService.update (owner scope, no mass assignment)', () => {
  it('lets the owner update the profile and relocates via PostGIS only when coordinates change', async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
    stubSalonReads(prisma);

    await service.update(OWNER, SALON_ID, { name: 'New Name' });
    expect(prisma.salon.update).toHaveBeenCalledWith({
      where: { id: SALON_ID },
      data: { name: 'New Name' },
    });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();

    await service.update(OWNER, SALON_ID, { latitude: 21.3, longitude: 81.7 });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('denies a staff member (member but not owner) and logs nothing destructive', async () => {
    const { service, prisma } = build();
    stubSalonReads(prisma);
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'staff' });

    await expect(service.update(STAFF, SALON_ID, { name: 'Hijack' })).rejects.toMatchObject({
      code: 'SALON_ACCESS_DENIED',
    });
    expect(prisma.salon.update).not.toHaveBeenCalled();
  });

  it('denies an owner of a DIFFERENT salon (cross-salon access)', async () => {
    const { service, prisma } = build();
    stubSalonReads(prisma);
    prisma.salonStaff.findFirst.mockResolvedValue(null); // no membership for this salon

    await expect(service.update(OWNER, SALON_ID, { name: 'x1' })).rejects.toMatchObject({
      code: 'SALON_ACCESS_DENIED',
    });
  });

  it('allows admin platform-wide', async () => {
    const { service, prisma } = build();
    stubSalonReads(prisma);
    await expect(service.update(ADMIN, SALON_ID, { city: 'Raipur' })).resolves.toMatchObject({
      viewerRole: 'admin',
    });
  });
});

describe('SalonsService hours', () => {
  const week = (open: number[]): PutHoursInput => ({
    days: Array.from({ length: 7 }, (_, weekday) =>
      open.includes(weekday)
        ? { weekday, isOpen: true, openTime: '09:00', closeTime: '20:00' }
        : { weekday, isOpen: false },
    ),
  });

  it('replaces the week: stores only open days, closed days are absent', async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
    prisma.salon.findUnique.mockResolvedValue(salonRecord());

    const hours = await service.putHours(OWNER, SALON_ID, week([1, 2, 3]));

    expect(prisma.operatingHours.deleteMany).toHaveBeenCalledWith({ where: { salonId: SALON_ID } });
    const created = (prisma.operatingHours.createMany.mock.calls[0]?.[0] as { data: unknown[] })
      .data;
    expect(created).toHaveLength(3);
    expect(hours.configured).toBe(true);
    expect(hours.days.filter((d) => d.isOpen).map((d) => d.weekday)).toEqual([1, 2, 3]);
    expect(hours.days[0]).toEqual({ weekday: 0, isOpen: false, openTime: null, closeTime: null });
    expect(hours.timezone).toBe('Asia/Kolkata');
  });

  it('an all-closed week clears hours and stays honestly "not configured"', async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
    prisma.salon.findUnique.mockResolvedValue(salonRecord());

    const hours = await service.putHours(OWNER, SALON_ID, week([]));
    expect(prisma.operatingHours.createMany).not.toHaveBeenCalled();
    expect(hours.configured).toBe(false);
  });

  it('denies staff from editing hours', async () => {
    const { service, prisma } = build();
    prisma.salon.findUnique.mockResolvedValue(salonRecord());
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'staff' });
    await expect(service.putHours(STAFF, SALON_ID, week([1]))).rejects.toMatchObject({
      code: 'SALON_ACCESS_DENIED',
    });
  });
});

describe('SalonsService.getMine (/me/salon)', () => {
  it("returns the signed-in member's salon with their salon role", async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue({ salonId: SALON_ID, role: 'staff' });
    stubSalonReads(prisma);
    const mine = await service.getMine(STAFF);
    expect(mine.viewerRole).toBe('staff');
    expect(mine.id).toBe(SALON_ID);
  });

  it('is SALON_NOT_FOUND when the user has no salon', async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue(null);
    await expect(service.getMine(OWNER)).rejects.toMatchObject({ code: 'SALON_NOT_FOUND' });
  });
});
