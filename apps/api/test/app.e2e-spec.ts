import { Body, Controller, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// --- test-only DTO + controller to exercise the global validation pipe ---
class EchoDto {
  @IsString()
  name!: string;
}

@Controller({ path: 'echo', version: '1' })
class EchoController {
  @Post()
  echo(@Body() body: EchoDto): EchoDto {
    return body;
  }
}

describe('API foundation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [EchoController],
    }).compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app, { apiPrefix: 'api', isProduction: false, corsOrigins: '*' });
    await app.init();
    // Warm up the Prisma connection pool so the first $queryRaw doesn't time
    // out on slow CI runners that use lazy connection semantics.
    await moduleRef.get(PrismaService).$connect();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bootstraps the application', () => {
    expect(app).toBeDefined();
  });

  it('GET /api/v1/health returns process health + request id header', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('soliton-api');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('GET /api/v1/health/ready returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('preserves a safe inbound x-request-id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', 'abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('returns a normalized error envelope for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.error.requestId).toBeTruthy();
    expect(res.body.error).not.toHaveProperty('stack');
  });

  it('rejects unexpected properties with a normalized validation error', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/echo')
      .send({ name: 'ok', unexpected: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('accepts a valid payload', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/echo').send({ name: 'ok' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('ok');
  });
});
