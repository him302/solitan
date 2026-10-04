import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { logger } from './logger';

/** Logs one structured line per handled request (method, route, status, duration). */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();

    const logCompletion = (): void => {
      logger.info(
        {
          method: req.method,
          route: req.route?.path ?? req.url,
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
        },
        'request',
      );
    };

    return next.handle().pipe(
      tap({
        next: logCompletion,
        error: logCompletion,
      }),
    );
  }
}
