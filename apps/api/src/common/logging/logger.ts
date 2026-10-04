import pino from 'pino';
import { getRequestId } from '../request-context/request-context';

/**
 * Application logger. The request id is injected automatically via the async-local
 * context, and known-sensitive fields are redacted so secrets never reach the logs.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'soliton-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'otp',
      'apiKey',
      'authorization',
      '*.password',
      '*.token',
      '*.otp',
    ],
    censor: '[redacted]',
  },
  mixin() {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
});
