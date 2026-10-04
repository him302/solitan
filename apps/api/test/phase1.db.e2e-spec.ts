import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PasswordService } from '../src/modules/auth/password/password.service';

/**
 * Phase 1 against REAL PostgreSQL + PostGIS. GATED: runs only with RUN_DB_TESTS=1 on a
 * migrated database. It is never counted as passing unless it actually ran.
 *
 *   docker compose -f infra/docker-compose.yml up -d
 *   pnpm --filter @soliton/api prisma:migrate
 *   RUN_DB_TESTS=1 pnpm --filter @soliton/api test
 */
const RUN = process.env.RUN_DB_TESTS === '1';
const dbDescribe = RUN ? describe : describe.skip;

dbDescribe('Phase 1 (real PostgreSQL + PostGIS)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaClient;
  const stamp = Date.now();
  const password = 'Passw0rd!phase1';
  const ownerEmail = `p1-owner-${stamp}@soliton.local`;
  let ownerToken = '';
  let salonId = '';

  // Two points ~ 1.1 km and ~ 11 km north of Raipur centre (21.2514, 81.6296).
  const NEAR = { latitude: 21.2614, longitude: 81.6296 };
  const FAR = { latitude: 21.3514, longitude: 81.6296 };

  beforeAll(async () => {
    prisma = new PrismaClient();
    const hash = await new PasswordService().hash(password);
    await prisma.user.create({ data: { email: ownerEmail, role: 'owner', passwordHash: hash } });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app, { apiPrefix: 'api', isProduction: false, corsOrigins: '*' });
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password })
      .expect(200);
    ownerToken = login.body.accessToken;
  });

  afterAll(async () => {
    if (salonId) {
      await prisma.operatingHours.deleteMany({ where: { salonId } });
      await prisma.service.deleteMany({ where: { salonId } });
      await prisma.queue.deleteMany({ where: { salonId } });
      await prisma.salonStaff.deleteMany({ where: { salonId } });
      await prisma.salon.deleteMany({ where: { id: salonId } });
    }
    await prisma.refreshToken.deleteMany({ where: { user: { email: ownerEmail } } });
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${ownerToken}` });

  it('owner creates a salon: pending, queue closed, INV-OWNER satisfied, point stored as (lng, lat)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/salons')
      .set(auth())
      .send({ name: `P1 Salon ${stamp}`, address: 'Test Road', city: 'Raipur', ...NEAR })
      .expect(201);
    salonId = res.body.id;
    expect(res.body).toMatchObject({ status: 'pending', queueStatus: 'closed' });
    expect(res.body.location.latitude).toBeCloseTo(NEAR.latitude, 5);
    expect(res.body.location.longitude).toBeCloseTo(NEAR.longitude, 5);

    const salon = await prisma.salon.findUniqueOrThrow({ where: { id: salonId } });
    const ownerStaff = await prisma.salonStaff.findFirst({
      where: { salonId, userId: salon.ownerId, role: 'owner', active: true },
    });
    expect(ownerStaff).not.toBeNull(); // INV-OWNER
    expect(await prisma.queue.count({ where: { salonId } })).toBe(1);

    const [point] = await prisma.$queryRaw<Array<{ x: number; y: number }>>`
      SELECT ST_X("geom"::geometry) AS x, ST_Y("geom"::geometry) AS y FROM "salons" WHERE "id" = ${salonId}::uuid`;
    expect(point?.x).toBeCloseTo(NEAR.longitude, 5); // X = longitude
    expect(point?.y).toBeCloseTo(NEAR.latitude, 5); // Y = latitude
  });

  it('a pending salon is invisible to discovery and to anonymous detail', async () => {
    const list = await request(app.getHttpServer())
      .get(`/api/v1/discovery/salons?q=${encodeURIComponent(`P1 Salon ${stamp}`)}`)
      .expect(200);
    expect(list.body.items).toHaveLength(0);
    await request(app.getHttpServer()).get(`/api/v1/salons/${salonId}`).expect(404);
    await request(app.getHttpServer()).get(`/api/v1/salons/${salonId}`).set(auth()).expect(200);
  });

  it('owner manages services; the public sees only active ones', async () => {
    const base = `/api/v1/salons/${salonId}/services`;
    const a = await request(app.getHttpServer())
      .post(base)
      .set(auth())
      .send({ name: 'Haircut', priceCents: 20000, estimatedMinutes: 30 })
      .expect(201);
    await request(app.getHttpServer())
      .post(base)
      .set(auth())
      .send({ name: 'Old Service', priceCents: 5000, estimatedMinutes: 10 })
      .expect(201);
    const all = await request(app.getHttpServer()).get(base).set(auth()).expect(200);
    expect(all.body).toHaveLength(2);

    const old = all.body.find((s: { name: string }) => s.name === 'Old Service');
    await request(app.getHttpServer()).delete(`${base}/${old.id}`).set(auth()).expect(200);
    await request(app.getHttpServer())
      .patch(`${base}/${a.body.id}`)
      .set(auth())
      .send({ priceCents: 25000, estimatedMinutes: 40 })
      .expect(200);

    // Activate the salon directly (admin verification is a later phase) for public checks.
    await prisma.salon.update({ where: { id: salonId }, data: { status: 'active' } });
    const pub = await request(app.getHttpServer()).get(base).expect(200);
    expect(pub.body).toHaveLength(1);
    expect(pub.body[0]).toMatchObject({ name: 'Haircut', priceCents: 25000, estimatedMinutes: 40 });
  });

  it('hours: saved, read back, and unconfigured → configured', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/v1/salons/${salonId}/hours`)
      .expect(200);
    expect(before.body.configured).toBe(false);
    const days = Array.from({ length: 7 }, (_, weekday) =>
      weekday === 0
        ? { weekday, isOpen: false }
        : { weekday, isOpen: true, openTime: '00:00', closeTime: '23:59' },
    );
    await request(app.getHttpServer())
      .put(`/api/v1/salons/${salonId}/hours`)
      .set(auth())
      .send({ days })
      .expect(200);
    const after = await request(app.getHttpServer())
      .get(`/api/v1/salons/${salonId}/hours`)
      .expect(200);
    expect(after.body.configured).toBe(true);
    expect(after.body.days[0].isOpen).toBe(false);
  });

  it('discovery: PostGIS distance, nearest ordering, radius filter, service search, pagination', async () => {
    const farSalon = await prisma.salon.create({
      data: {
        ownerId: (await prisma.user.findFirstOrThrow({ where: { email: ownerEmail } })).id,
        name: `P1 Far ${stamp}`,
        city: 'Raipur',
        address: 'Far Road',
        status: 'active',
      },
    });
    await prisma.$executeRaw`UPDATE "salons" SET "geom" = ST_SetSRID(ST_MakePoint(${FAR.longitude}, ${FAR.latitude}), 4326)::geography WHERE "id" = ${farSalon.id}::uuid`;

    try {
      const here = '&lat=21.2514&lng=81.6296';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/discovery/salons?q=P1&sort=nearest${here}`)
        .expect(200);
      const names = res.body.items.map((i: { name: string }) => i.name);
      expect(names.indexOf(`P1 Salon ${stamp}`)).toBeLessThan(names.indexOf(`P1 Far ${stamp}`));
      const near = res.body.items.find((i: { id: string }) => i.id === salonId);
      expect(near.distanceMeters).toBeGreaterThan(900);
      expect(near.distanceMeters).toBeLessThan(1300); // ≈ 1.1 km
      expect(near.liveQueue).toEqual({ available: false });

      const radius = await request(app.getHttpServer())
        .get(`/api/v1/discovery/salons?q=P1&radiusKm=3${here}`)
        .expect(200);
      expect(radius.body.items.map((i: { id: string }) => i.id)).toEqual([salonId]);

      const byService = await request(app.getHttpServer())
        .get('/api/v1/discovery/salons?q=Haircut')
        .expect(200);
      expect(byService.body.items.some((i: { id: string }) => i.id === salonId)).toBe(true);

      const page1 = await request(app.getHttpServer())
        .get(`/api/v1/discovery/salons?q=P1&limit=1&sort=name`)
        .expect(200);
      expect(page1.body.items).toHaveLength(1);
      expect(page1.body.page.nextOffset).toBe(1);

      const map = await request(app.getHttpServer())
        .get('/api/v1/discovery/map?lat=21.2514&lng=81.6296&radiusKm=3')
        .expect(200);
      expect(map.body.markers.some((m: { id: string }) => m.id === salonId)).toBe(true);
    } finally {
      await prisma.salon.delete({ where: { id: farSalon.id } });
    }
  });

  it('keeps the PostGIS GIST index and review CHECK intact', async () => {
    const idx = await prisma.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes WHERE tablename = 'salons' AND indexdef ILIKE '%using gist%'`;
    expect(idx.length).toBeGreaterThan(0);
    const chk = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint WHERE conname = 'reviews_rating_check'`;
    expect(chk).toHaveLength(1);
  });
});
