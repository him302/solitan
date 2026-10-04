import type { PrismaService } from '../../src/modules/prisma/prisma.service';

type Fn = jest.Mock;

export interface PrismaMock {
  salon: { findUnique: Fn; findFirst: Fn; create: Fn; update: Fn };
  salonStaff: { findFirst: Fn; create: Fn };
  queue: { create: Fn };
  operatingHours: { findMany: Fn; deleteMany: Fn; createMany: Fn };
  service: { findMany: Fn; findFirst: Fn; create: Fn; update: Fn };
  review: { aggregate: Fn; groupBy: Fn };
  $transaction: Fn;
  $executeRaw: Fn;
  $queryRaw: Fn;
}

/** A call-recording Prisma double. `$transaction` runs the callback against the same mock. */
export function createPrismaMock(): PrismaMock {
  const mock: PrismaMock = {
    salon: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    salonStaff: { findFirst: jest.fn(), create: jest.fn() },
    queue: { create: jest.fn() },
    operatingHours: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    service: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    review: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  };
  mock.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => unknown) => fn(mock));
  return mock;
}

export const asPrisma = (mock: PrismaMock): PrismaService => mock as unknown as PrismaService;

export const OWNER = { id: 'owner-1', role: 'owner' as const };
export const STAFF = { id: 'staff-1', role: 'staff' as const };
export const ADMIN = { id: 'admin-1', role: 'admin' as const };
export const CUSTOMER = { id: 'cust-1', role: 'customer' as const };

export const SALON_ID = '11111111-1111-4111-8111-111111111111';
export const SERVICE_ID = '22222222-2222-4222-8222-222222222222';

export function salonRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SALON_ID,
    ownerId: OWNER.id,
    name: 'Glow Salon',
    photoUrl: null,
    address: 'MG Road, Raipur',
    city: 'Raipur',
    status: 'active',
    queueStatus: 'closed',
    bufferConfig: null,
    ...overrides,
  };
}
