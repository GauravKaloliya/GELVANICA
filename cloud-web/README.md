# Gnovium Cloud Web

> Next.js 16 dashboard — the web client for the Gnovium Knowledge Operating System.

| | |
|---|---|
| Framework | Next.js 16 (App Router) — standalone output |
| Runtime | React 19 + TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 — 6-theme neo-brutalist system, shared via `@gnovium/shared` |
| Animation | framer-motion 12 |
| Icons | lucide-react |
| Design System | `packages/shared/styles/base.css` (imported via globals.css) |
| Deploy | Vercel (static export, config in `vercel.json`) |

---

## Quick Start

```bash
npm install
```

```bash
# Standalone (default port 3000)
npm run dev -w cloud-web

# Or via the unified proxy (auto-routes to /app on port 3000)
npm run dev
```

```bash
npm run build -w cloud-web    # production build
```

Other scripts:

| Command | Action |
|---------|--------|
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

### Dependencies

| Runtime | Dev |
|---------|-----|
| next 16.2.9 | typescript ^5 |
| react 19.2.4 / react-dom 19.2.4 | tailwindcss ^4 |
| framer-motion ^12.40.0 | @tailwindcss/postcss ^4 |
| lucide-react ^1.17.0 | eslint ^9 + eslint-config-next |
| | @types/node, @types/react, @types/react-dom |

---

## Environment

```env
NEXT_PUBLIC_BASE_PATH=/app
NEXT_PUBLIC_API_URL=https://api.gnovium.com/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

`.env.local` ships with `NEXT_PUBLIC_BASE_PATH=/app` for local proxy routing.

---

## Proxy Routing

When accessed through the unified proxy (`npm run dev` from root):

| External | Internal | App |
|----------|----------|-----|
| `http://localhost:3000/app` | `http://localhost:3101` | Cloud Web (port 3101) |

The `basePath: /app` in `next.config.ts` ensures asset URLs are correct behind the proxy. When running standalone, `NEXT_PUBLIC_BASE_PATH` should be empty.

---

---

## Architecture

### Provider Hierarchy

```
layout.tsx (server)
  ├─ <Script> theme-init           — prevents hydration flash
  └─ SessionProvider (client)
       └─ ThemeProvider (client)
            ├─ Navbar
            └─ <main>{children}</main>
```

### Route Map

| Route | Page | Access |
|-------|------|--------|
| `/` | Dashboard — welcome stats, knowledge graph card, recent activity | Authenticated (client redirect) |
| `/signin` | Login form + Google OAuth button | Public |
| `/signup` | Registration with password strength & avatar upload | Public |
| `/auth/electron/callback` | Electron OAuth bridge spinner | Public |

### Auth Flow

1. **Login** — `POST /auth/login` → tokens stored in localStorage → redirect to `/`
2. **Google OAuth** — `google.accounts.oauth2.initTokenClient` → `POST /auth/google` → login
3. **Signup** — `POST /auth/register` → (optional) avatar upload
4. **Session restore** — reads `access_token` from localStorage → `GET /auth/me` to hydrate user
5. **Electron mode** — `?mode=electron` redirects to `/auth/electron/callback` instead of localStorage

> **Note:** Route protection is client-side (useEffect redirect). No middleware.ts exists.

---

## CSS Architecture

The cloud-web app uses the shared design system:

```
cloud-web/src/app/globals.css (4 lines)
  ├── @import "tailwindcss"
  ├── @source packages/shared/components/  (scans shared components for Tailwind classes)
  ├── @source packages/shared/index.ts
  └── @import "../../../packages/shared/styles/base.css"  (832 lines — all theme tokens, utilities)
```

This means cloud-web's `globals.css` is a thin 4-line importer. All design tokens, custom utilities, and neo-brutalist styles live in the shared package.

---

## Theme System

Six themes defined in the shared design system:

| Class | Name |
|-------|------|
| `:root` | Light (default) |
| `.dark` | Dark |
| `.sepia` | Sepia |
| `.high-contrast` | High Contrast |
| `.ocean` | Ocean |
| `.midnight` | Midnight |

Theme persists in `localStorage` key `gnovium-theme` with OS `prefers-color-scheme` fallback.

---

## API Client (`src/lib/api.ts`)

Base URL: `NEXT_PUBLIC_API_URL` (default `https://api.gnovium.com/api/v1`)

```typescript
register(email, password, name)  → POST /auth/register
login(email, password)            → POST /auth/login
googleLogin(credential)           → POST /auth/google
checkEmail(email)                 → GET /auth/check-email
```

---

## Deployment

```bash
npm run build -w cloud-web
```

Deploys to Vercel via `vercel.json`:

- `cleanUrls: true`, no trailing slashes
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`
- Images are **unoptimized** (`next.config.ts`)
- `basePath: /app` only when behind the proxy; standalone builds omit basePath

```bash
vercel --prod
```

---

## Backend API Dependencies

Cloud-web calls the [Gnovium API](../backend/README.md) for authentication only. The full backend serves **114 endpoints across 22 modules** — cloud-web is a lightweight auth gateway; the main workspace UI lives in the [local-app](../local-app/README.md).

---

## Related

- [Root README](../README.md) — Full project overview, architecture, API docs
- [Shared Package](../packages/shared/README.md) — UniversalNavbar, base.css design system
- [Docs](../docs/README.md) — API documentation portal
- [Landing](../landing/README.md) — Marketing landing page
- [Backend](../backend/README.md) — Flask API (114 endpoints, 22 modules)
