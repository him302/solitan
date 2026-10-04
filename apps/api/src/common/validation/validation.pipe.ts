import { ValidationPipe } from '@nestjs/common';

/**
 * Builds the global request-validation pipe used for all future DTOs:
 *  - whitelist: strips properties without decorators
 *  - forbidNonWhitelisted: rejects unexpected properties (400) rather than ignoring them
 *  - transform: coerces payloads into their DTO types
 *
 * No feature DTOs exist yet; this establishes consistent behavior for when they do.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}
