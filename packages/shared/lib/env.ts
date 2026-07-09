import { z } from 'zod';

/**
 * Single source of truth for all environment variables across all 3 apps.
 * Convention: NEXT_PUBLIC_<APP>_URL — never NEXT_PUBLIC_DOCS_URL vs DOCS_BASE_PATH.
 */
export const envSchema = z.object({
  NEXT_PUBLIC_LANDING_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_FRONTEND_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_DOCS_URL: z.string().url().default('http://localhost:3002'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:5000'),

  NEXT_PUBLIC_LANDING_BASE_PATH: z.string().default(''),
  NEXT_PUBLIC_FRONTEND_BASE_PATH: z.string().default('/app'),
  NEXT_PUBLIC_DOCS_BASE_PATH: z.string().default('/api/v1/docs'),
  NEXT_PUBLIC_API_BASE_PATH: z.string().default('/api/v1'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Static definitions for documentation & tooling.
 * Mirrors envSchema keys with human-readable descriptions.
 */
export const ENV_DEFINITIONS: Record<string, { description: string; default: string; required: boolean }> = {
  NEXT_PUBLIC_LANDING_URL: {
    description: 'Base URL of the landing site',
    default: 'http://localhost:3000',
    required: false,
  },
  NEXT_PUBLIC_FRONTEND_URL: {
    description: 'Base URL of the frontend app',
    default: 'http://localhost:3001',
    required: false,
  },
  NEXT_PUBLIC_DOCS_URL: {
    description: 'Base URL of the docs app',
    default: 'http://localhost:3002',
    required: false,
  },
  NEXT_PUBLIC_API_URL: {
    description: 'Base URL of the backend API',
    default: 'http://localhost:5000',
    required: false,
  },
  NEXT_PUBLIC_LANDING_BASE_PATH: {
    description: 'Sub-path where landing is served (empty = root)',
    default: '',
    required: false,
  },
  NEXT_PUBLIC_FRONTEND_BASE_PATH: {
    description: 'Sub-path where frontend is served',
    default: '/app',
    required: false,
  },
  NEXT_PUBLIC_DOCS_BASE_PATH: {
    description: 'Sub-path where docs is served',
    default: '/api/v1/docs',
    required: false,
  },
  NEXT_PUBLIC_API_BASE_PATH: {
    description: 'Sub-path where the backend API is served',
    default: '/api/v1',
    required: false,
  },
};


export function createEnvConfig(
  env: Record<string, string | undefined>,
): EnvConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    if (typeof process !== 'undefined') {
      console.error('❌ Invalid environment configuration:');
      for (const issue of result.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    }
    return envSchema.parse({}) as EnvConfig;
  }
  return result.data;
}

export function assertEnv(
  key: string,
  env: Record<string, string | undefined>,
): string {
  const value = env[key];
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
        `   Set it in .env.local or your deployment environment.\n` +
        `   See .env.example or env-schema.ts for documentation.`,
    );
  }
  return value;
}
