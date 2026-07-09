/**
 * Pre-build environment validation script.
 * Run before `next build` in each app to fail fast on misconfiguration.
 *
 * Usage: node scripts/validate-env.mjs [app-name]
 * Example: node scripts/validate-env.mjs landing
 */

const REQUIRED_VARS = {
  landing: [],
  'cloud-web': ['NEXT_PUBLIC_DOCS_URL'],
  docs: ['NEXT_PUBLIC_API_URL'],
};

const ALL_VARS = [
  'NEXT_PUBLIC_LANDING_URL',
  'NEXT_PUBLIC_FRONTEND_URL',
  'NEXT_PUBLIC_DOCS_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_LANDING_BASE_PATH',
  'NEXT_PUBLIC_FRONTEND_BASE_PATH',
  'NEXT_PUBLIC_DOCS_BASE_PATH',
  'NEXT_PUBLIC_API_BASE_PATH',
];

const app = process.argv[2];
const required = app ? REQUIRED_VARS[app] ?? [] : ALL_VARS;

let exitCode = 0;
const missing = required.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error(`\n❌ [validate-env] Missing required env vars for "${app || 'all'}":`);
  for (const v of missing) {
    console.error(`   - ${v}`);
  }
  console.error(
    '\n   Set them in .env.local or your deployment environment.\n' +
      '   See env-schema.ts for full documentation.\n',
  );
  exitCode = 1;
}

if (app) {
  const unused = ALL_VARS.filter((v) => !REQUIRED_VARS[app]?.includes(v));
  if (unused.length > 0) {
    console.warn(`\n⚠️  [validate-env] Unused vars for "${app}": ${unused.join(', ')}`);
  }
}

if (exitCode === 0) {
  const appLabel = app || 'all';
  console.log(`✅ [validate-env] All required vars present for "${appLabel}".`);
}

process.exit(exitCode);
