import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { TokenService } from '../src/modules/auth/tokens/token.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RedisService } from '../src/modules/realtime/redis.service';
import {
  OWNER,
  SALON_ID,
  SERVICE_ID,
  createPrismaMock,
  salonRecord,
  type PrismaMock,
} from './support/prisma-mock';

/**
 * Phase 1 HTTP pipeline (guards → Zod pipes → controllers → services → error envelope)
 * against a MOCKED Prisma. Runs offline. It proves routing, authorization and error
 * codes; real PostGIS behaviour is covered by the gated phase1.db.e2e-spec.ts.
 */
jest.setTimeout(30000);

const redisStub = {
  status: 'disabled',
  getClient: () => null,
  onModuleInit: () => undefined,
  onModuleDestroy: () => Promise.resolve(),
};

describe('Phase 1 API pipeline (offline, mocked Prisma)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let tokens: { owner: string; staff: string; customer: string; admin: string };

  beforeAll(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(RedisService)
      .useValue(redisStub)
      .compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app, { apiPrefix: 'api', isProduction: false, corsOrigins: '*' });
    await app.init();

    const t = app.get(TokenService);
    tokens = {
      owner: t.signAccessToken({ id: OWNER.id, role: 'owner' }),
      staff: t.signAccessToken({ id: 'staff-1', role: 'staff' }),
      customer: t.signAccessToken({ id: 'cust-1', role: 'customer' }),
      admin: t.signAccessToken({ id: 'admin-1', role: 'admin' }),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.operatingHours.findMany.mockResolvedValue([]);
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });
    prisma.review.groupBy.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => unknown) => fn(prisma));
  });

  const server = () => app.getHttpServer();
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const validSalon = {
    name: 'Glow Salon',
    address: 'MG Road, Raipur',
    city: 'Raipur',
    latitude: 21.2514,
    longitude: 81.6296,
  };

  describe('POST /api/v1/salons', () => {
    it('401 for anonymous, 403 for customer and staff', async () => {
      await request(server()).post('/api/v1/salons').send(validSalon).expect(401);
      const customer = await request(server())
        .post('/api/v1/salons')
        .set(auth(tokens.customer))
        .send(validSalon)
        .expect(403);
      expect(customer.body.error.code).toBe('FORBIDDEN');
      await request(server())
        .post('/api/v1/salons')
        .set(auth(tokens.staff))
        .send(validSalon)
        .expect(403);
      expect(prisma.salon.create).not.toHaveBeenCalled();
    });

    it('rejects mass-assignment of ownerId / status with a validation error and no DB write', async () => {
      const res = await request(server())
        .post('/api/v1/salons')
        .set(auth(tokens.owner))
        .send({ ...validSalon, ownerId: 'someone-else', status: 'active' })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.requestId).toBeTruthy();
      expect(prisma.salon.create).not.toHaveBeenCalled();
    });

    it('returns INVALID_LOCATION for out-of-range coordinates', async () => {
      const res = await request(server())
        .post('/api/v1/salons')
        .set(auth(tokens.owner))
        .send({ ...validSalon, latitude: 123 })
        .expect(400);
      expect(res.body.error.code).toBe('INVALID_LOCATION');
    });

    it('creates a PENDING salon for the authenticated owner', async () => {
      prisma.salon.findFirst.mockResolvedValue(null);
      prisma.salon.create.mockResolvedValue({ id: SALON_ID });
      prisma.salon.findUnique.mockResolvedValue(salonRecord({ status: 'pending' }));
      prisma.$queryRaw.mockResolvedValue([{ lat: 21.2514, lng: 81.6296, distance_m: null }]);

      const res = await request(server())
        .post('/api/v1/salons')
        .set(auth(tokens.owner))
        .send(validSalon)
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'pending',
        queueStatus: 'closed',
        viewerRole: 'owner',
      });
      expect(res.body).not.toHaveProperty('ownerId');
    });

    it('409 SALON_ALREADY_EXISTS for a second salon', async () => {
      prisma.salon.findFirst.mockResolvedValue({ id: 'existing' });
      const res = await request(server())
        .post('/api/v1/salons')
        .set(auth(tokens.owner))
        .send(validSalon)
        .expect(409);
      expect(res.body.error.code).toBe('SALON_ALREADY_EXISTS');
    });
  });

  describe('salon detail visibility', () => {
    it('400 for a malformed id', async () => {
      await request(server()).get('/api/v1/salons/not-a-uuid').expect(400);
    });

    it('404 SALON_NOT_FOUND for a pending salon seen anonymously', async () => {
      prisma.salon.findUnique.mockResolvedValue(salonRecord({ status: 'pending' }));
      const res = await request(server()).get(`/api/v1/salons/${SALON_ID}`).expect(404);
      expect(res.body.error.code).toBe('SALON_NOT_FOUND');
    });

    it('401 when a bad bearer token is sent (so clients can refresh), not silent anonymous', async () => {
      await request(server())
        .get(`/api/v1/salons/${SALON_ID}`)
        .set('authorization', 'Bearer garbage')
        .expect(401);
    });

    it('serves a public active salon without authentication and without private fields', async () => {
      prisma.salon.findUnique.mockResolvedValue(salonRecord());
      prisma.$queryRaw.mockResolvedValue([{ lat: 21.25, lng: 81.63, distance_m: null }]);
      prisma.service.findMany.mockResolvedValue([]);
      const res = await request(server()).get(`/api/v1/salons/${SALON_ID}`).expect(200);
      expect(res.body).toMatchObject({ id: SALON_ID, liveQueue: { available: false } });
      expect(JSON.stringify(res.body)).not.toMatch(/ownerId|bufferConfig|queueStatus/);
    });

    it('rejects half a coordinate pair as INVALID_LOCATION', async () => {
      const res = await request(server()).get(`/api/v1/salons/${SALON_ID}?lat=21.2`).expect(400);
      expect(res.body.error.code).toBe('INVALID_LOCATION');
    });
  });

  describe('owner-only configuration', () => {
    it('PATCH: staff member → 403 SALON_ACCESS_DENIED; stranger → 403; no write happens', async () => {
      prisma.salon.findUnique.mockResolvedValue(salonRecord());
      prisma.salonStaff.findFirst.mockResolvedValue({ role: 'staff' });
      const staff = await request(server())
        .patch(`/api/v1/salons/${SALON_ID}`)
        .set(auth(tokens.staff))
        .send({ name: 'Hijacked' })
        .expect(403);
      expect(staff.body.error.code).toBe('SALON_ACCESS_DENIED');

      prisma.salonStaff.findFirst.mockResolvedValue(null);
      await request(server())
        .patch(`/api/v1/salons/${SALON_ID}`)
        .set(auth(tokens.owner))
        .send({ name: 'Other owner' })
        .expect(403);
      expect(prisma.salon.update).not.toHaveBeenCalled();
    });

    it('PATCH refuses to change status', async () => {
      prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
      await request(server())
        .patch(`/api/v1/salons/${SALON_ID}`)
        .set(auth(tokens.owner))
        .send({ status: 'active' })
        .expect(400);
    });

    it('PUT hours: invalid ranges → INVALID_OPERATING_HOURS', async () => {
      prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
      const days = Array.from({ length: 7 }, (_, weekday) =>
        weekday === 1
          ? { weekday, isOpen: true, openTime: '20:00', closeTime: '09:00' }
          : { weekday, isOpen: false },
      );
      const res = await request(server())
        .put(`/api/v1/salons/${SALON_ID}/hours`)
        .set(auth(tokens.owner))
        .send({ days })
        .expect(400);
      expect(res.body.error.code).toBe('INVALID_OPERATING_HOURS');
    });

    it('PUT hours: valid week saved by the owner', async () => {
      prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
      prisma.salon.findUnique.mockResolvedValue(salonRecord());
      const days = Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        isOpen: weekday !== 0,
        ...(weekday !== 0 && { openTime: '09:00', closeTime: '20:00' }),
      }));
      const res = await request(server())
        .put(`/api/v1/salons/${SALON_ID}/hours`)
        .set(auth(tokens.owner))
        .send({ days })
        .expect(200);
      expect(res.body).toMatchObject({ timezone: 'Asia/Kolkata', configured: true });
    });
  });

  describe('services', () => {
    const body = { name: 'Haircut', priceCents: 20000, estimatedMinutes: 30 };

    it('401 anonymous / 403 customer / 403 staff on create', async () => {
      await request(server()).post(`/api/v1/salons/${SALON_ID}/services`).send(body).expect(401);
      const customer = await request(server())
        .post(`/api/v1/salons/${SALON_ID}/services`)
        .set(auth(tokens.customer))
        .send(body)
        .expect(403);
      expect(customer.body.error.code).toBe('SALON_ACCESS_DENIED');

      prisma.salon.findUnique.mockResolvedValue(salonRecord());
      prisma.salonStaff.findFirst.mockResolvedValue({ role: 'staff' });
      await request(server())
        .post(`/api/v1/salons/${SALON_ID}/services`)
        .set(auth(tokens.staff))
        .send(body)
        .expect(403);
      expect(prisma.service.create).not.toHaveBeenCalled();
    });

    it('INVALID_PRICE and INVALID_DURATION codes', async () => {
      prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
      const price = await request(server())
        .post(`/api/v1/salons/${SALON_ID}/services`)
        .set(auth(tokens.owner))
        .send({ ...body, priceCents: -5 })
        .expect(400);
      expect(price.body.error.code).toBe('INVALID_PRICE');
      const duration = await request(server())
        .post(`/api/v1/salons/${SALON_ID}/services`)
        .set(auth(tokens.owner))
        .send({ ...body, estimatedMinutes: 0 })
        .expect(400);
      expect(duration.body.error.code).toBe('INVALID_DURATION');
    });

    it('owner creates a service (201) and DELETE soft-deactivates it', async () => {
      prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
      prisma.salon.findUnique.mockResolvedValue(salonRecord());
      const record = { id: SERVICE_ID, salonId: SALON_ID, ...body, active: true };
      prisma.service.create.mockResolvedValue(record);
      const created = await request(server())
        .post(`/api/v1/salons/${SALON_ID}/services`)
        .set(auth(tokens.owner))
        .send(body)
        .expect(201);
      expect(created.body).toMatchObject({ priceCents: 20000, currency: 'INR' });

      prisma.service.findFirst.mockResolvedValue(record);
      prisma.service.update.mockResolvedValue({ ...record, active: false });
      const removed = await request(server())
        .delete(`/api/v1/salons/${SALON_ID}/services/${SERVICE_ID}`)
        .set(auth(tokens.owner))
        .expect(200);
      expect(removed.body.active).toBe(false);
    });
  });

  describe('GET /api/v1/discovery/*', () => {
    it('is public, bounded and validated', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      const ok = await request(server())
        .get('/api/v1/discovery/salons?q=hair&lat=21.25&lng=81.63')
        .expect(200);
      expect(ok.body).toMatchObject({ items: [], appliedSort: 'nearest' });

      const tooBig = await request(server()).get('/api/v1/discovery/salons?limit=500').expect(400);
      expect(tooBig.body.error.code).toBe('INVALID_DISCOVERY_QUERY');
      const unknownSort = await request(server())
        .get('/api/v1/discovery/salons?sort=best')
        .expect(400);
      expect(unknownSort.body.error.code).toBe('INVALID_DISCOVERY_QUERY');
    });

    it('treats empty query values as absent', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      await request(server()).get('/api/v1/discovery/salons?q=&lat=&lng=&city=').expect(200);
    });

    it('the map endpoint requires a location', async () => {
      await request(server()).get('/api/v1/discovery/map').expect(400);
      prisma.$queryRaw.mockResolvedValue([]);
      await request(server()).get('/api/v1/discovery/map?lat=21.25&lng=81.63').expect(200);
    });
  });

  describe('GET /api/v1/maps/geocode', () => {
    it('requires an owner/admin; customers are forbidden', async () => {
      await request(server()).get('/api/v1/maps/geocode?address=MG Road Raipur').expect(401);
      await request(server())
        .get('/api/v1/maps/geocode?address=MG Road Raipur')
        .set(auth(tokens.customer))
        .expect(403);
    });

    it('honestly reports address lookup as unavailable with the free local provider', async () => {
      const res = await request(server())
        .get('/api/v1/maps/geocode?address=MG Road Raipur')
        .set(auth(tokens.owner))
        .expect(200);
      expect(res.body).toEqual({ available: false, reason: 'NOT_SUPPORTED' });
    });
  });

  describe('GET /api/v1/health/providers (free-only policy)', () => {
    it('reports every provider as free/local/disabled and NO external calls', async () => {
      const res = await request(server()).get('/api/v1/health/providers').expect(200);
      expect(res.body).toEqual({
        freeLocalMode: true,
        providers: {
          map: 'local',
          otp: 'dev',
          payment: 'disabled',
          messaging: 'disabled',
          storage: 'local',
          analytics: 'local',
        },
        externalCalls: [],
      });
    });
  });

  describe('GET /api/v1/me/salon', () => {
    it('requires authentication and 404s for a user without a salon', async () => {
      await request(server()).get('/api/v1/me/salon').expect(401);
      prisma.salonStaff.findFirst.mockResolvedValue(null);
      const res = await request(server())
        .get('/api/v1/me/salon')
        .set(auth(tokens.owner))
        .expect(404);
      expect(res.body.error.code).toBe('SALON_NOT_FOUND');
    });
  });
});
