import { z } from 'zod';

/**
 * Environment schema.
 *
 * FREE-ONLY: Soliton contains no paid or usage-billed integration. Every provider switch
 * below accepts only the free/local/disabled value that is actually implemented, so a paid
 * provider cannot be selected by configuration. Adding one later is an explicit decision
 * that means writing a new implementation AND widening these enums on purpose.
 */
const alwaysTrue = z.enum(['true']).transform(() => true as const);

export const envSchema = z.object({
  // --- Public / safe ---
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  API_PREFIX: z.string().min(1).default('api'),
  API_VERSION: z.string().min(1).default('1'),
  // Comma-separated list, or "*" for reflect-any (development convenience).
  CORS_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // --- Auth ---
  // Secret is OPTIONAL in dev/test (a dev fallback is used) but REQUIRED in production
  // via the refinement below. Access tokens are short-lived; refresh tokens rotate.
  JWT_ACCESS_SECRET: z.string().min(16).optional(),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // --- Provider policy (FREE-FIRST) ---
  /** Only `true` is accepted: there is no paid mode to switch into. */
  FREE_LOCAL_MODE: alwaysTrue.default('true'),
  /** local = free, no network, no key. */
  MAP_PROVIDER: z.enum(['local']).default('local'),
  /** dev = logs the code outside production only; never sends an SMS. */
  OTP_PROVIDER: z.enum(['dev']).default('dev'),
  PAYMENT_PROVIDER: z.enum(['disabled']).default('disabled'),
  MESSAGING_PROVIDER: z.enum(['disabled']).default('disabled'),
  STORAGE_PROVIDER: z.enum(['local']).default('local'),
  ANALYTICS_PROVIDER: z.enum(['local']).default('local'),

  /**
   * Optional XYZ raster tile template for the local map style, ideally SELF-HOSTED
   * (public OpenStreetMap tile servers must not be used at scale). Unset = blank canvas,
   * which makes no tile requests at all.
   */
  MAP_TILE_URL_TEMPLATE: z
    .string()
    .refine(
      (value) => value.includes('{z}') && value.includes('{x}') && value.includes('{y}'),
      'MAP_TILE_URL_TEMPLATE must contain {z}, {x} and {y}',
    )
    .optional(),
  MAP_TILE_ATTRIBUTION: z.string().max(200).optional(),

  // --- Infrastructure (local Docker by default) ---
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

const refinedEnvSchema = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.JWT_ACCESS_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_ACCESS_SECRET'],
      message: 'JWT_ACCESS_SECRET is required in production',
    });
  }
});

let _cachedEnv: Env | null = null;

/** Validator passed to Nest's ConfigModule. Throws a readable, secret-free error if invalid. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = refinedEnvSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  _cachedEnv = result.data;
  return result.data;
}

/** Returns the validated env. Safe to call from any provider — validateEnv runs at module import time. */
export function getValidatedEnv(): Env {
  if (!_cachedEnv) throw new Error('getValidatedEnv() called before validateEnv()');
  return _cachedEnv;
}
