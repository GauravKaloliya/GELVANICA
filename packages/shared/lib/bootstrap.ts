/**
 * Bootstrap module — call at app startup to validate environment.
 * Import this in each app's root layout to fail fast on misconfiguration.
 */
import { createEnvConfig, assertEnv } from './env';

let validated = false;

const APP_CRITICAL_VARS: Record<string, string[]> = {
  landing: ['NEXT_PUBLIC_LANDING_URL', 'NEXT_PUBLIC_DOCS_URL', 'NEXT_PUBLIC_CLOUD_WEB_URL'],
  'cloud-web': ['NEXT_PUBLIC_CLOUD_WEB_URL', 'NEXT_PUBLIC_DOCS_URL'],
  docs: ['NEXT_PUBLIC_DOCS_URL', 'NEXT_PUBLIC_API_URL'],
};

export function bootstrapEnv(): void {
  if (validated || typeof process === 'undefined') return;
  validated = true;

  const appName =
    process.env.NEXT_PUBLIC_DOCS_BASE_PATH !== undefined
      ? 'docs'
      : process.env.NEXT_PUBLIC_CLOUD_WEB_BASE_PATH !== undefined
        ? 'cloud-web'
        : 'landing';

  try {
    createEnvConfig(process.env as Record<string, string | undefined>);

    for (const key of APP_CRITICAL_VARS[appName]) {
      assertEnv(key, process.env as Record<string, string | undefined>);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [${appName}] Environment validated`);
    }
  } catch (err) {
    console.error(`❌ [${appName}] Environment validation failed:`, err);
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    }
  }
}
