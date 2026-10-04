import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * An expected, client-facing failure carrying a stable machine-readable code. The
 * AllExceptionsFilter renders it into the standard error envelope.
 */
export class DomainException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: unknown,
  ) {
    super({ code, message }, status);
  }
}

export const salonNotFound = (): DomainException =>
  new DomainException(ErrorCode.SALON_NOT_FOUND, 'Salon not found', HttpStatus.NOT_FOUND);

export const salonAccessDenied = (): DomainException =>
  new DomainException(
    ErrorCode.SALON_ACCESS_DENIED,
    'You do not have access to this salon',
    HttpStatus.FORBIDDEN,
  );

export const salonAlreadyExists = (): DomainException =>
  new DomainException(
    ErrorCode.SALON_ALREADY_EXISTS,
    'This account already owns a salon',
    HttpStatus.CONFLICT,
  );

export const serviceNotFound = (): DomainException =>
  new DomainException(ErrorCode.SERVICE_NOT_FOUND, 'Service not found', HttpStatus.NOT_FOUND);
