import type { AppId, AppRoute } from './routes';
import { createEnvConfig, type EnvConfig } from './env';

/**
 * Resolves the full URL for a path in a given app,
 * respecting basePath configuration.
 */
export function appUrl<T extends AppId>(
  app: T,
  path: string,
  config?: EnvConfig,
): AppRoute<T> {
  const cfg = config ?? createEnvConfig(
    typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {},
  );

  const baseMap: Record<AppId, string> = {
    landing: cfg.NEXT_PUBLIC_LANDING_URL,
    'cloud-web': cfg.NEXT_PUBLIC_CLOUD_WEB_URL,
    docs: cfg.NEXT_PUBLIC_DOCS_URL,
  };
  const basePathMap: Record<AppId, string> = {
    landing: cfg.NEXT_PUBLIC_LANDING_BASE_PATH,
    'cloud-web': cfg.NEXT_PUBLIC_CLOUD_WEB_BASE_PATH,
    docs: cfg.NEXT_PUBLIC_DOCS_BASE_PATH,
  };

  const base = baseMap[app].replace(/\/+$/, '');
  const bp = basePathMap[app].replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;

  return `${base}${bp}${p}` as AppRoute<T>;
}

/** Shorthand: docs URL for a given path */
export function docsUrl(path = ''): AppRoute<'docs'> {
  return appUrl('docs', path || '/');
}

/** Shorthand: cloud-web URL for a given path */
export function cloudWebUrl(path = ''): AppRoute<'cloud-web'> {
  return appUrl('cloud-web', path || '/');
}

/** Shorthand: landing URL for a given path */
export function landingUrl(path = ''): AppRoute<'landing'> {
  return appUrl('landing', path || '/');
}
