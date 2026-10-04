import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { OTP_STORE, type OtpStore } from '../src/modules/auth/otp/otp-store';
import { PasswordService } from '../src/modules/auth/password/password.service';

/**
 * Auth integration against real PostgreSQL. Opt-in (RUN_DB_TESTS=1), requires a
 * migrated database.
 */
const RUN = process.env.RUN_DB_TESTS === '1';
const dbDescribe = RUN ? describe : describe.skip;

dbDescribe('auth (e2e, requires PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const phone = `+1555${Date.now().toString().slice(-7)}`;
  const email = `owner-${Date.now()}@soliton.local`;
  const password = 'password12345';

  beforeAll(async () => {
    prisma = new PrismaClient();
    const passwords = new PasswordService();
    await prisma.user.create({
      data: { email, role: 'owner', passwordHash: await passwords.hash(password) },
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app, { apiPrefix: 'api', isProduction: false, corsOrigins: '*' });
    await app.init();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { OR: [{ email }, { phone }] } });
    await prisma.$disconnect();
    await app.close();
  });

  it('completes the OTP flow and issues tokens', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({ phone }).expect(200);
    const store = app.get<OtpStore>(OTP_STORE);
    const code = (await store.get(phone))!.code;

    const verified = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code })
      .expect(200);
    expect(verified.body.accessToken).toBeTruthy();
    expect(verified.body.refreshToken).toBeTruthy();
  });

  it('logs in with email/password and rejects bad credentials', async () => {
    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    expect(ok.body.accessToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('refreshes (rotating) and revokes on logout', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const { refreshToken } = login.body;

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshed.body.refreshToken).not.toBe(refreshToken);

    // old refresh token is now invalid (rotation)
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(401);
  });

  it('protects /auth/me and returns the current user', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.role).toBe('owner');
  });
});
