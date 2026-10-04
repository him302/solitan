import { DomainErrorCode } from '@soliton/api-contract';

/**
 * Stable error-code vocabulary: generic HTTP-level codes plus the domain codes shared
 * with clients via @soliton/api-contract.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ...DomainErrorCode,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
