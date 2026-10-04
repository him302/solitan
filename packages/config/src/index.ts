/**
 * @soliton/config — typed environment/config foundation.
 *
 * Validates process environment against a Zod schema and fails fast with a readable
 * error. Enforces the public/server separation by convention:
 *
 *  - PUBLIC values may ship in client bundles. They MUST be prefixed `EXPO_PUBLIC_`
 *    (mobile) or `NEXT_PUBLIC_` (admin). Example: the API base URL.
 *  - SERVER-ONLY values (DB credentials, JWT secrets, Redis credentials) must NEVER be
 *    prefixed as public and must never be read from client code.
 *
 * Soliton uses no third-party paid services, so there are no provider API keys to place
 * in either category.
 */
import { z } from 'zod';

export const PUBLIC_PREFIXES = ['EXPO_PUBLIC_', 'NEXT_PUBLIC_'] as const;

/** True if an env var name is allowed to be exposed to a client bundle. */
export function isPublicEnvKey(key: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export type EnvSource = Record<string, string | undefined>;

/**
 * Parses and validates environment variables against a Zod schema. Throws a single
 * aggregated error listing every invalid/missing key.
 */
export function parseEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  source: EnvSource,
): z.infer<TSchema> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

/**
 * Guards that a schema describing client-public config only references keys with a
 * public prefix. Intended for use in tests to prevent accidental secret exposure.
 */
export function assertPublicOnly(keys: readonly string[]): void {
  const leaked = keys.filter((key) => !isPublicEnvKey(key));
  if (leaked.length > 0) {
    throw new Error(`Non-public env keys referenced in client config: ${leaked.join(', ')}`);
  }
}
