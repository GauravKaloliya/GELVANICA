/**
 * Typed route registry for all 3 apps.
 * Every path lives here — no hardcoded strings anywhere else.
 */

/* ─── App Identification ────────────────────── */

export type AppId = 'landing' | 'frontend' | 'docs';

/* ─── Branded Types ─────────────────────────── */

/** Any URL path or full URL originating from the route registry */
export type AppRoute<T extends AppId = AppId> = string & {
  readonly __brand: 'app-route';
  readonly __app?: T;
};

/** Full URL to an external domain (not one of our apps) */
export type ExternalUrl = string & {
  readonly __brand: 'external-url';
};

/** Hash anchor path like `/#features` or `#section` */
export type AnchorHash = string & {
  readonly __brand: 'anchor-hash';
};

/** Convenience alias for internal-only routes */
export type InternalRoute = AppRoute;

/* ─── Auth / Public route types ─────────────── */

export type RouteAccess = 'auth' | 'public';

export type AuthRoute<T extends AppId = AppId> = AppRoute<T> & {
  readonly __access: 'auth';
};

export type PublicRoute<T extends AppId = AppId> = AppRoute<T> & {
  readonly __access: 'public';
};

/* ─── Query Params ──────────────────────────── */

export type QueryParams<T extends Record<string, string | undefined>> = {
  params: T;
  build: () => string;
};

export function queryParams<T extends Record<string, string | undefined>>(
  base: AppRoute,
  params: T,
): QueryParams<T> {
  return {
    params,
    build: () => {
      const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
      if (entries.length === 0) return base;
      const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      return `${base}?${qs}` as AppRoute;
    },
  };
}

/* ─── Route Definition ─────────────────────── */

export interface RouteDefinition<P extends Record<string, string> = Record<string, never>> {
  pattern: string;
  build: (params: P) => AppRoute;
  match: (path: string) => P | null;
}

function defineRoute<P extends Record<string, string> = Record<string, never>>(
  pattern: string,
): RouteDefinition<P> {
  const paramNames = Array.from(pattern.matchAll(/:(\w+)/g), (m) => m[1]);

  return {
    pattern,
    build: (params: P) => {
      if (paramNames.length === 0) return pattern as AppRoute;
      let result = pattern;
      for (const key of paramNames) {
        const value = params[key];
        if (value === undefined) {
          throw new Error(`Missing route parameter: ${key} for pattern "${pattern}"`);
        }
        result = result.replace(`:${key}`, encodeURIComponent(value));
      }
      return result as AppRoute;
    },
    match: (path: string): P | null => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexStr = '^' + escaped.replace(/:\w+/g, '([^/]+)') + '$';
      const regex = new RegExp(regexStr);
      const match = path.match(regex);
      if (!match) return null;
      const result = {} as Record<string, string>;
      paramNames.forEach((key, i) => {
        result[key] = match[i + 1];
      });
      return result as P;
    },
  };
}

/* ─── Route Registry ───────────────────────── */

export const Routes = {
  landing: {
    home: defineRoute('/'),
    download: defineRoute('/download'),
    features: defineRoute('/#features'),
    ai: defineRoute('/#ai'),
    platform: defineRoute('/#platform'),
    whoItsFor: defineRoute('/#who-its-for'),
    about: defineRoute('/#about'),
  },
  frontend: {
    home: defineRoute('/'),
    signIn: defineRoute('/signin'),
    signUp: defineRoute('/signup'),
    workspace: defineRoute('/'),
    workspaceDetail: defineRoute<{ id: string }>('/workspaces/:id'),
    entityDetail: defineRoute<{ workspaceId: string; entityId: string }>('/workspaces/:workspaceId/entities/:entityId'),
  },
  docs: {
    home: defineRoute('/'),
    download: defineRoute('/download'),
    changelog: defineRoute('/changelog'),
    errorCatalog: defineRoute('/error-catalog'),
    apiDocs: defineRoute('/'),
  },
} as const;

export type RouteTree = typeof Routes;

/* ─── Branded URL helpers ───────────────────── */

export function toAnchorHash(path: AppRoute): AnchorHash {
  return path as unknown as AnchorHash;
}

export function toExternalUrl(url: string): ExternalUrl {
  return url as unknown as ExternalUrl;
}

/* ─── Cross-app route helpers ──────────────── */

export type CrossAppRoute = {
  app: AppId;
  path: string;
};

export function crossApp<T extends AppId>(
  app: T,
  path: string,
): AppRoute<T> {
  return path as AppRoute<T>;
}
