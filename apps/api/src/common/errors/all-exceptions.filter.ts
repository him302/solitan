import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorEnvelope } from '@soliton/api-contract';
import { logger } from '../logging/logger';
import type { RequestWithId } from '../request-context/request-id.middleware';
import { ErrorCode } from './error-codes';
import { DomainException } from './domain.exception';

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    default:
      return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST;
  }
}

/**
 * Converts every thrown error into the standard Soliton error envelope:
 *
 *   { "error": { "code", "message", "requestId"?, "details"? } }
 *
 * Validation errors are normalized; stack traces are never exposed in responses
 * (they are logged). In production, unknown-error messages are not leaked.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly isProduction: boolean) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithId>();
    const res = ctx.getResponse<Response>();
    const requestId = req.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = statusToCode(status);
      message = exception.message;

      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const body = response as { message?: unknown };
        // class-validator / ValidationPipe emit a `message` array of field errors.
        if (status === HttpStatus.BAD_REQUEST && Array.isArray(body.message)) {
          code = ErrorCode.VALIDATION_ERROR;
          message = 'Validation failed';
          details = body.message;
        }
      }
    } else if (exception instanceof Error) {
      if (!this.isProduction && exception.message) {
        message = exception.message;
      }
    }

    // Stack traces stay in logs, never in responses.
    const logLevel = status >= 500 ? 'error' : 'warn';
    logger[logLevel](
      {
        statusCode: status,
        code,
        err: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      'request error',
    );

    const envelope: ErrorEnvelope = {
      error: {
        code,
        message,
        requestId,
        ...(details !== undefined ? { details } : {}),
      },
    };

    res.status(status).json(envelope);
  }
}
