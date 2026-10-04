import {
  ApiError,
  buildQueryString,
  createSolitonApi,
  type FetchLike,
  type TokenStore,
} from './index';

interface Reply {
  status: number;
  body?: unknown;
}

/** Scripted fetch: each call consumes the next reply and records the request. */
function scripted(replies: Reply[]): {
  fetch: FetchLike;
  calls: Array<{
    url: string;
    init?: { method?: string; headers?: Record<string, string>; body?: string };
  }>;
} {
  const calls: Array<{
    url: string;
    init?: { method?: string; headers?: Record<string, string>; body?: string };
  }> = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const reply = replies.shift() ?? { status: 500 };
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: async () => {
        if (reply.body === undefined) throw new Error('no body');
        return reply.body;
      },
    };
  };
  return { fetch, calls };
}

function memoryTokens(initial?: {
  access: string;
  refresh: string;
}): TokenStore & { snapshot(): unknown } {
  let access = initial?.access ?? null;
  let refresh = initial?.refresh ?? null;
  return {
    getAccessToken: async () => access,
    getRefreshToken: async () => refresh,
    setTokens: async (a, r) => {
      access = a;
      refresh = r;
    },
    clear: async () => {
      access = null;
      refresh = null;
    },
    snapshot: () => ({ access, refresh }),
  };
}

const BASE = 'https://api.test';
const errorBody = (code: string, message = 'm') => ({
  error: { code, message, requestId: 'req-1' },
});

describe('buildQueryString', () => {
  it('encodes values and skips undefined, null and empty', () => {
    expect(buildQueryString({ q: 'hair cut', lat: 21.25, city: '', x: undefined, y: null })).toBe(
      '?q=hair%20cut&lat=21.25',
    );
    expect(buildQueryString({})).toBe('');
    expect(buildQueryString(undefined)).toBe('');
  });
});

describe('request building', () => {
  it('targets /api/v1 with query params and no auth header when signed out', async () => {
    const { fetch, calls } = scripted([{ status: 200, body: { items: [] } }]);
    const api = createSolitonApi({ baseUrl: BASE, fetch });
    await api.discovery.search({ q: 'beard', lat: 21.25, lng: 81.63, limit: 10 });
    expect(calls[0]?.url).toBe(
      `${BASE}/api/v1/discovery/salons?q=beard&lat=21.25&lng=81.63&limit=10`,
    );
    expect(calls[0]?.init?.headers).not.toHaveProperty('authorization');
  });

  it('sends the bearer token and a JSON body', async () => {
    const { fetch, calls } = scripted([{ status: 200, body: {} }]);
    const api = createSolitonApi({
      baseUrl: BASE,
      fetch,
      tokens: memoryTokens({ access: 'A1', refresh: 'R1' }),
    });
    await api.salons.update('s1', { name: 'New name' });
    expect(calls[0]?.init?.headers?.authorization).toBe('Bearer A1');
    expect(calls[0]?.init?.method).toBe('PATCH');
    expect(JSON.parse(calls[0]?.init?.body ?? '{}')).toEqual({ name: 'New name' });
  });

  it('passes viewer coordinates for distance on salon detail', async () => {
    const { fetch, calls } = scripted([{ status: 200, body: {} }]);
    await createSolitonApi({ baseUrl: BASE, fetch }).salons.detail('s1', {
      latitude: 21.2,
      longitude: 81.6,
    });
    expect(calls[0]?.url).toBe(`${BASE}/api/v1/salons/s1?lat=21.2&lng=81.6`);
  });
});

describe('errors', () => {
  it('turns the error envelope into an ApiError with its stable code', async () => {
    const { fetch } = scripted([
      { status: 404, body: errorBody('SALON_NOT_FOUND', 'Salon not found') },
    ]);
    const error = await createSolitonApi({ baseUrl: BASE, fetch })
      .salons.detail('x')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'SALON_NOT_FOUND', requestId: 'req-1' });
  });

  it('maps a non-envelope failure to UNKNOWN_ERROR and a thrown fetch to NETWORK_ERROR', async () => {
    const bad = scripted([{ status: 502 }]);
    await expect(
      createSolitonApi({ baseUrl: BASE, fetch: bad.fetch }).salons.mine(),
    ).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
      status: 502,
    });
    const down: FetchLike = async () => {
      throw new Error('offline');
    };
    await expect(
      createSolitonApi({ baseUrl: BASE, fetch: down }).salons.mine(),
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });
});

describe('login / session', () => {
  it('stores tokens on login and clears them on logout', async () => {
    const tokens = memoryTokens();
    const { fetch, calls } = scripted([
      { status: 200, body: { accessToken: 'A', refreshToken: 'R', expiresInSeconds: 900 } },
      { status: 200, body: { ok: true } },
    ]);
    const api = createSolitonApi({ baseUrl: BASE, fetch, tokens });
    await api.auth.login('o@x.com', 'password123');
    expect(tokens.snapshot()).toEqual({ access: 'A', refresh: 'R' });

    await api.auth.logout();
    expect(calls[1]?.url).toContain('/auth/logout');
    expect(tokens.snapshot()).toEqual({ access: null, refresh: null });
  });

  it('refreshes once on 401 and retries the original request with the new token', async () => {
    const tokens = memoryTokens({ access: 'OLD', refresh: 'R1' });
    const { fetch, calls } = scripted([
      { status: 401, body: errorBody('UNAUTHORIZED') },
      { status: 200, body: { accessToken: 'NEW', refreshToken: 'R2', expiresInSeconds: 900 } },
      { status: 200, body: { id: 'salon-1' } },
    ]);
    const api = createSolitonApi({ baseUrl: BASE, fetch, tokens });
    await expect(api.salons.mine()).resolves.toEqual({ id: 'salon-1' });
    expect(calls.map((c) => c.url.split('/api/v1')[1])).toEqual([
      '/me/salon',
      '/auth/refresh',
      '/me/salon',
    ]);
    expect(calls[2]?.init?.headers?.authorization).toBe('Bearer NEW');
    expect(tokens.snapshot()).toEqual({ access: 'NEW', refresh: 'R2' });
  });

  it('shares ONE refresh between concurrent 401s (single-flight)', async () => {
    const tokens = memoryTokens({ access: 'OLD', refresh: 'R1' });
    const { fetch, calls } = scripted([
      { status: 401, body: errorBody('UNAUTHORIZED') },
      { status: 401, body: errorBody('UNAUTHORIZED') },
      { status: 200, body: { accessToken: 'NEW', refreshToken: 'R2', expiresInSeconds: 900 } },
      { status: 200, body: { a: 1 } },
      { status: 200, body: { b: 2 } },
    ]);
    const api = createSolitonApi({ baseUrl: BASE, fetch, tokens });
    await Promise.all([api.salons.mine(), api.services.list('s1')]);
    expect(calls.filter((c) => c.url.includes('/auth/refresh'))).toHaveLength(1);
  });

  it('clears the session and signals expiry when refresh fails', async () => {
    const tokens = memoryTokens({ access: 'OLD', refresh: 'DEAD' });
    const onSessionExpired = jest.fn();
    const { fetch } = scripted([
      { status: 401, body: errorBody('UNAUTHORIZED') },
      { status: 401, body: errorBody('UNAUTHORIZED') },
    ]);
    const api = createSolitonApi({ baseUrl: BASE, fetch, tokens, onSessionExpired });
    await expect(api.salons.mine()).rejects.toMatchObject({ status: 401 });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(tokens.snapshot()).toEqual({ access: null, refresh: null });
  });

  it('does not attempt a refresh for a failed login', async () => {
    const tokens = memoryTokens({ access: 'x', refresh: 'y' });
    const { fetch, calls } = scripted([
      { status: 401, body: errorBody('UNAUTHORIZED', 'Invalid credentials') },
    ]);
    await expect(
      createSolitonApi({ baseUrl: BASE, fetch, tokens }).auth.login('a@b.co', 'wrongpass1'),
    ).rejects.toMatchObject({
      status: 401,
    });
    expect(calls).toHaveLength(1);
  });
});
