import { z } from 'zod'

const envSchema = z.object({
  FLASK_HOST: z.string().min(1).default('127.0.0.1'),
  FLASK_PORT: z.coerce.number().int().min(1).max(65535).default(5001),
  DEV_PORT: z.coerce.number().int().min(1).max(65535).default(5173),
  CLOUD_WEB_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SERVER_URL: z.string().url().default('https://app.gnovium.com'),
  API_URL: z.string().url().default('https://api.gnovium.com/v1'),
  AUTH_URL: z.string().url().default('https://app.gnovium.com/auth'),
  LANDING_URL: z.string().url().default('https://gnovium.com'),
  ISSUES_URL: z.string().url().default('https://github.com/GauravKaloliya/GNOVIUM/issues'),
})

export type ValidatedEnv = z.infer<typeof envSchema>

export function validateEnv(raw: Record<string, unknown>): ValidatedEnv {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Environment validation failed:\n${issues}`)
  }
  return result.data
}
