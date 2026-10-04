import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId: string;
}

/** Async-local store carrying per-request metadata (currently the request id). */
export const requestContext = new AsyncLocalStorage<RequestStore>();

/** Returns the current request id, if running within a request context. */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
