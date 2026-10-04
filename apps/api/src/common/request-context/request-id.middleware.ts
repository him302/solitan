import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from './request-context';

export interface RequestWithId extends Request {
  id?: string;
}

/** Accepts only a conservative inbound id format; otherwise we generate our own. */
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Assigns a request id (preserving a safe inbound `x-request-id`, else generating a
 * UUID), echoes it on the response header, and runs the rest of the request inside an
 * async-local context so logs can include it without threading it through calls.
 */
export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  requestContext.run({ requestId: id }, () => next());
}
