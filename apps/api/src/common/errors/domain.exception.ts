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

export const staffNotFound = (): DomainException =>
  new DomainException(ErrorCode.STAFF_NOT_FOUND, 'Staff member not found', HttpStatus.NOT_FOUND);

export const staffAlreadyMember = (): DomainException =>
  new DomainException(
    ErrorCode.STAFF_ALREADY_MEMBER,
    'This person is already a member of this salon',
    HttpStatus.CONFLICT,
  );

/**
 * Guards the INV-OWNER invariant: a salon must always retain at least one active owner,
 * or nobody can administer it again.
 */
export const staffLastOwner = (): DomainException =>
  new DomainException(
    ErrorCode.STAFF_LAST_OWNER,
    'A salon must keep at least one active owner',
    HttpStatus.CONFLICT,
  );

export const staffServiceMismatch = (): DomainException =>
  new DomainException(
    ErrorCode.STAFF_SERVICE_MISMATCH,
    'One or more services do not belong to this salon',
    HttpStatus.BAD_REQUEST,
  );
