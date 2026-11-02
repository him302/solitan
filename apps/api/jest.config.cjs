/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  /**
   * Each *.e2e-spec.ts boots a full Nest application — HTTP server, Socket.IO gateway,
   * Prisma client. Jest's default 5s timeout is comfortable for one of those in
   * isolation and not for several starting at once, so under default parallelism the
   * suite failed intermittently in beforeAll with every test in the affected file
   * reported as broken. The failure looked like a logic error and was not.
   *
   * 30s is far longer than a healthy bootstrap (~3s observed) and still short enough to
   * surface a genuine hang.
   */
  testTimeout: 30_000,
  /**
   * Bootstrapping apps in parallel is what caused that contention. Capping workers keeps
   * the unit specs — the large majority — parallel and fast, while leaving enough
   * headroom that concurrent app startups do not starve each other.
   *
   * Some suites still log "a worker process has failed to exit gracefully": a
   * pre-existing teardown leak (sockets/timers outliving afterAll). It does not fail the
   * run and is tracked separately.
   */
  maxWorkers: 2,
};
