import type { LoggerService } from '@nestjs/common';
import { logger } from './logger';

/** Adapts the pino logger to Nest's LoggerService so framework logs are structured too. */
export class PinoLoggerService implements LoggerService {
  log(message: unknown, context?: string): void {
    logger.info({ context }, String(message));
  }

  error(message: unknown, stack?: string, context?: string): void {
    logger.error({ context, stack }, String(message));
  }

  warn(message: unknown, context?: string): void {
    logger.warn({ context }, String(message));
  }

  debug(message: unknown, context?: string): void {
    logger.debug({ context }, String(message));
  }

  verbose(message: unknown, context?: string): void {
    logger.trace({ context }, String(message));
  }
}
