import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import type { RedisService } from '../realtime/redis.service';
import type { ProviderPolicyService } from '../providers/provider-policy.service';
import type { PrismaService } from '../prisma/prisma.service';

const redisStub = { status: 'disabled' } as unknown as RedisService;
const providersStub = {
  describe: () => ({ freeLocalMode: true, providers: {}, externalCalls: [] }),
} as unknown as ProviderPolicyService;
const prismaStub = {
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
} as unknown as PrismaService;

describe('HealthController', () => {
  const controller = new HealthController(new HealthService(), redisStub, providersStub, prismaStub);

  it('reports process liveness', () => {
    const result = controller.liveness();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('soliton-api');
    expect(typeof result.version).toBe('string');
    expect(typeof result.timestamp).toBe('string');
  });

  it('reports readiness with the same honest process-only payload', async () => {
    const result = await controller.readiness();
    expect(result.status).toBe('ok');
  });

  it('reports realtime status honestly (in-memory when Redis is not up)', () => {
    const result = controller.realtime();
    expect(result.redis).toBe('disabled');
    expect(result.adapter).toBe('in-memory');
    expect(result.status).toBe('ok');
  });
});
