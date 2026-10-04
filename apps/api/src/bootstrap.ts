import { VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { requestIdMiddleware } from './common/request-context/request-id.middleware';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { createValidationPipe } from './common/validation/validation.pipe';

export interface ConfigureOptions {
  apiPrefix: string;
  isProduction: boolean;
  corsOrigins: '*' | string[];
  bodyLimit?: string;
}

/**
 * Applies the full request pipeline. Shared by the real bootstrap and the e2e tests so
 * both exercise identical behavior (prefix, versioning, security, validation, logging,
 * error envelope, request id, graceful shutdown).
 */
export function configureApp(app: INestApplication, options: ConfigureOptions): void {
  const bodyLimit = options.bodyLimit ?? '1mb';

  // Request id first, so it is available to everything downstream (and to logs).
  app.use(requestIdMiddleware);

  // Security headers + explicit, bounded body parsing.
  app.use(helmet());
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  // CORS: an explicit allowlist in production; reflect the request origin for the
  // development '*' convenience (compatible with credentials, unlike a literal '*').
  app.enableCors({
    origin: options.corsOrigins === '*' ? true : options.corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix(options.apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(options.isProduction));

  app.enableShutdownHooks();
}
