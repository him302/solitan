import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { TokenService } from '../src/modules/auth/tokens/token.service';
import { RedisService } from '../src/modules/realtime/redis.service';
import { salonRoom } from '@soliton/api-contract';

// This realtime e2e runs WITHOUT external infra: Redis is stubbed (in-memory Socket.IO
// adapter) and the admin/customer authorization paths do not touch the database.

jest.setTimeout(20000);

const redisStub: Pick<RedisService, 'status' | 'getClient'> & {
  onModuleInit: () => void;
  onModuleDestroy: () => Promise<void>;
} = {
  status: 'disabled',
  getClient: () => null,
  onModuleInit: () => undefined,
  onModuleDestroy: () => Promise.resolve(),
};

function connectClient(port: number, token?: string): Socket {
  return io(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    auth: token ? { token } : {},
  });
}

function awaitResult(socket: Socket): Promise<'connected' | 'rejected'> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: 'connected' | 'rejected') => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    socket.on('connect', () =>
      setTimeout(() => settle(socket.connected ? 'connected' : 'rejected'), 200),
    );
    socket.on('disconnect', () => settle('rejected'));
    socket.on('connect_error', () => settle('rejected'));
    setTimeout(() => settle(socket.connected ? 'connected' : 'rejected'), 3000);
  });
}

function emitAck(socket: Socket, event: string, payload: unknown): Promise<unknown> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

describe('realtime gateway (e2e, in-memory adapter)', () => {
  let app: INestApplication;
  let port: number;
  let adminToken: string;
  let customerToken: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RedisService)
      .useValue(redisStub)
      .compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app, { apiPrefix: 'api', isProduction: false, corsOrigins: '*' });
    await app.init();
    await app.listen(0);
    port = (app.getHttpServer().address() as AddressInfo).port;

    const tokens = app.get(TokenService);
    adminToken = tokens.signAccessToken({ id: 'admin-1', role: 'admin' });
    customerToken = tokens.signAccessToken({ id: 'cust-1', role: 'customer' });
  });

  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    await app.close();
  });

  it('accepts an authenticated connection', async () => {
    const socket = connectClient(port, adminToken);
    sockets.push(socket);
    expect(await awaitResult(socket)).toBe('connected');
  });

  it('rejects an unauthenticated connection', async () => {
    const socket = connectClient(port);
    sockets.push(socket);
    expect(await awaitResult(socket)).toBe('rejected');
  });

  it('authorizes an admin to subscribe to a salon room', async () => {
    const socket = connectClient(port, adminToken);
    sockets.push(socket);
    await awaitResult(socket);
    const ack = (await emitAck(socket, 'subscribe', { room: salonRoom('s1') })) as { ok: boolean };
    expect(ack.ok).toBe(true);
  });

  it('forbids a customer from a salon room', async () => {
    const socket = connectClient(port, customerToken);
    sockets.push(socket);
    await awaitResult(socket);
    const ack = (await emitAck(socket, 'subscribe', { room: salonRoom('s1') })) as {
      ok: boolean;
      error?: string;
    };
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe('forbidden');
  });

  it('returns a snapshot stub for an authorized room', async () => {
    const socket = connectClient(port, adminToken);
    sockets.push(socket);
    await awaitResult(socket);
    const snap = (await emitAck(socket, 'snapshot:request', { room: salonRoom('s1') })) as {
      room: string;
      version: number;
    };
    expect(snap.room).toBe(salonRoom('s1'));
    expect(snap.version).toBe(0);
  });
});
