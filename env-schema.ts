/**
 * Root environment schema — single source of truth for all env vars.
 *
 * Convention: NEXT_PUBLIC_<APP>_URL for all app base URLs.
 *            NEXT_PUBLIC_<APP>_BASE_PATH for serving paths.
 *
 * The canonical definitions live in @gnovium/shared/lib/env.ts.
 * This file re-exports for convenience and documents the full contract.
 */
export { ENV_DEFINITIONS } from '@gnovium/shared';
