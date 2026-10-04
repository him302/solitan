import { PrismaClient } from '@prisma/client';

/**
 * Real Postgres+PostGIS tests. Opt-in: they require a migrated + seeded database and
 * are skipped unless RUN_DB_TESTS=1 (so the default suite stays green without a DB).
 *
 *   docker compose -f infra/docker-compose.yml up -d
 *   pnpm --filter @soliton/api prisma:migrate && pnpm --filter @soliton/api db:seed
 *   RUN_DB_TESTS=1 pnpm --filter @soliton/api test
 */
const RUN = process.env.RUN_DB_TESTS === '1';
const dbDescribe = RUN ? describe : describe.skip;

dbDescribe('database foundation (requires Postgres+PostGIS)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has the postgis extension', async () => {
    const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'postgis'`;
    expect(rows.length).toBe(1);
  });

  it('salons.geom is geography(Point, 4326)', async () => {
    const rows = await prisma.$queryRaw<Array<{ type: string; srid: number }>>`
      SELECT type, srid FROM geography_columns
      WHERE f_table_name = 'salons' AND f_geography_column = 'geom'`;
    expect(rows[0]?.type).toBe('Point');
    expect(Number(rows[0]?.srid)).toBe(4326);
  });

  it('has a GIST index on salons.geom', async () => {
    const rows = await prisma.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes
      WHERE tablename = 'salons' AND indexdef ILIKE '%using gist%'`;
    expect(rows.length).toBeGreaterThan(0);
  });

  it('enforces the reviews rating CHECK (1..5)', async () => {
    const rows = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint WHERE conname = 'reviews_rating_check'`;
    expect(rows.length).toBe(1);
  });

  it('seed satisfies INV-OWNER', async () => {
    const salon = await prisma.salon.findFirstOrThrow({ where: { name: 'Soliton Demo Salon' } });
    const ownerStaff = await prisma.salonStaff.findFirst({
      where: { salonId: salon.id, userId: salon.ownerId, role: 'owner', active: true },
    });
    expect(ownerStaff).not.toBeNull();
  });

  it('seed created the expected core rows', async () => {
    const salon = await prisma.salon.findFirstOrThrow({ where: { name: 'Soliton Demo Salon' } });
    expect(await prisma.service.count({ where: { salonId: salon.id } })).toBe(3);
    expect(await prisma.chair.count({ where: { salonId: salon.id } })).toBe(2);
    expect(await prisma.queue.findUnique({ where: { salonId: salon.id } })).not.toBeNull();
  });

  it('enforces one queue per salon (unique salonId)', async () => {
    const salon = await prisma.salon.findFirstOrThrow({ where: { name: 'Soliton Demo Salon' } });
    await expect(prisma.queue.create({ data: { salonId: salon.id } })).rejects.toThrow();
  });

  it('rejects a cross-salon StaffService link (composite FK)', async () => {
    const owner = await prisma.user.findFirstOrThrow({ where: { email: 'owner@soliton.local' } });
    const firstSalon = await prisma.salon.findFirstOrThrow({
      where: { name: 'Soliton Demo Salon' },
    });
    const staff = await prisma.salonStaff.findFirstOrThrow({
      where: { salonId: firstSalon.id, role: 'staff' },
    });

    const other = await prisma.salon.create({
      data: { ownerId: owner.id, name: `Other Salon ${Date.now()}` },
    });
    const otherService = await prisma.service.create({
      data: { salonId: other.id, name: 'Other Service', estimatedMinutes: 10 },
    });

    // staff belongs to firstSalon; a StaffService row with salonId=firstSalon but a
    // service from `other` must fail the (serviceId, salonId) composite foreign key.
    await expect(
      prisma.staffService.create({
        data: { salonStaffId: staff.id, serviceId: otherService.id, salonId: firstSalon.id },
      }),
    ).rejects.toThrow();

    await prisma.service.delete({ where: { id: otherService.id } });
    await prisma.salon.delete({ where: { id: other.id } });
  });
});
