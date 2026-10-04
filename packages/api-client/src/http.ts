import { errorEnvelopeSchema } from '@soliton/api-contract';

/** Minimal fetch surface (satisfied by the global fetch) so the client is testable offline. */
export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Where the session lives. Mobile apps back this with expo-secure-store, never AsyncStorage. */
export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(accessToken: string, refreshToken: string): Promise<void>;
  clear(): Promise<void>;
}

/** A failed API call. `code` is the stable machine-readable code from the error envelope. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface HttpClientConfig {
  /** Origin only, e.g. https://api.example.com — `/api/v1` is appended. */
  baseUrl: string;
  fetch?: FetchLike;
  tokens?: TokenStore;
  /** Called when a refresh fails and the session was cleared (e.g. route to login). */
  onSessionExpired?: () => void;
}

export interface RequestOptions {
  query?: object;
  body?: unknown;
}

const API_PREFIX = '/api/v1';

function resolveFetch(config: HttpClientConfig): FetchLike {
  const candidate = config.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
  if (!candidate) throw new Error('No fetch implementation available');
  return candidate;
}

/** Serialises a query object, skipping undefined/null/empty values. */
export function buildQueryString(query: object | undefined): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export class HttpClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(private readonly config: HttpClientConfig) {}

  get<T>(path: string, query?: object): Promise<T> {
    return this.request<T>('GET', path, { query });
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }
  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    try {
      return await this.send<T>(method, path, options);
    } catch (error) {
      const isAuthRoute = path.startsWith('/auth/');
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        !isAuthRoute &&
        this.config.tokens &&
        (await this.refreshSession())
      ) {
        return this.send<T>(method, path, options); // retried exactly once
      }
      throw error;
    }
  }

  /** Single-flight refresh: concurrent 401s share one refresh request. */
  private refreshSession(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    const tokens = this.config.tokens;
    const refreshToken = await tokens?.getRefreshToken();
    if (!tokens || !refreshToken) return false;
    try {
      const fresh = await this.send<{ accessToken: string; refreshToken: string }>(
        'POST',
        '/auth/refresh',
        { body: { refreshToken } },
      );
      await tokens.setTokens(fresh.accessToken, fresh.refreshToken);
      return true;
    } catch {
      await tokens.clear();
      this.config.onSessionExpired?.();
      return false;
    }
  }

  private async send<T>(method: string, path: string, options: RequestOptions): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const accessToken = await this.config.tokens?.getAccessToken();
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;

    let response;
    try {
      response = await resolveFetch(this.config)(
        `${this.config.baseUrl}${API_PREFIX}${path}${buildQueryString(options.query)}`,
        {
          method,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        },
      );
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server');
    }

    const payload = await response.json().catch(() => null);
    if (response.ok) return payload as T;

    const envelope = errorEnvelopeSchema.safeParse(payload);
    if (envelope.success) {
      const { code, message, requestId, details } = envelope.data.error;
      throw new ApiError(response.status, code, message, requestId, details);
    }
    throw new ApiError(response.status, 'UNKNOWN_ERROR', `Request failed (${response.status})`);
  }
}
