import { HttpStatus } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { z, ZodIssue, ZodTypeAny } from 'zod';
import { DomainException } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-codes';

/** Picks the most specific domain error code for a set of validation issues. */
export function codeForIssues(issues: readonly ZodIssue[], fallback: ErrorCode): ErrorCode {
  const touches = (...names: string[]): boolean =>
    issues.some((issue) => issue.path.some((segment) => names.includes(String(segment))));
  if (touches('latitude', 'longitude', 'lat', 'lng')) return ErrorCode.INVALID_LOCATION;
  if (touches('priceCents')) return ErrorCode.INVALID_PRICE;
  if (touches('estimatedMinutes')) return ErrorCode.INVALID_DURATION;
  return fallback;
}

/**
 * Validates a request body/query against a shared @soliton/api-contract Zod schema —
 * the same schema the clients use. Unknown keys are rejected by the schemas' `.strict()`,
 * which is what prevents mass assignment (ownerId, status, …).
 */
export class ZodPipe<TSchema extends ZodTypeAny> implements PipeTransform<
  unknown,
  z.infer<TSchema>
> {
  constructor(
    private readonly schema: TSchema,
    private readonly fallbackCode: ErrorCode = ErrorCode.VALIDATION_ERROR,
  ) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value ?? {});
    if (result.success) return result.data;
    throw new DomainException(
      codeForIssues(result.error.issues, this.fallbackCode),
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
}

/** Query strings carry empty values (`?q=`) that must mean "absent", not "0". */
export function stripEmptyQueryValues(query: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(query).filter(([, v]) => v !== '' && v !== undefined));
}

/** ZodPipe for query strings: empty values mean "absent" (never coerced to 0). */
export class ZodQueryPipe<TSchema extends ZodTypeAny> extends ZodPipe<TSchema> {
  override transform(value: unknown): z.infer<TSchema> {
    const query =
      typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    return super.transform(stripEmptyQueryValues(query));
  }
}
