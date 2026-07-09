export { createEnvConfig, assertEnv, envSchema, ENV_DEFINITIONS } from './env';
export type { EnvConfig } from './env';

export {
  appUrl,
  docsUrl,
  frontendUrl,
  landingUrl,
} from './urls';

export {
  Routes,
  crossApp,
  queryParams,
  toAnchorHash,
  toExternalUrl,
} from './routes';
export type {
  AppId,
  AppRoute,
  RouteDefinition,
  RouteTree,
  CrossAppRoute,
  ExternalUrl,
  AnchorHash,
  InternalRoute,
  RouteAccess,
  AuthRoute,
  PublicRoute,
  QueryParams,
} from './routes';

export { useCrossAppRouter } from './useCrossAppRouter';
export { bootstrapEnv } from './bootstrap';
export { getNavItems, mobileDefault } from './navConfig';
export type { Variant, MobileDefaultConfig } from './navConfig';