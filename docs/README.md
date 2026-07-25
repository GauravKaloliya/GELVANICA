# Gnovium Documentation Portal

> **114 endpoints · 83 routes · 22 modules — documented, demonstrable, deployable.**

A neo-brutalist documentation site for the Gnovium Knowledge OS API. Built as a static Next.js 16 app with zero runtime API dependencies — every endpoint, error code, changelog entry, and auth guide is compiled at build time from TypeScript data modules.

| | |
|---|---|
| Framework | Next.js 16 (App Router) — standalone output |
| Runtime | React 19 + TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 — 6-theme neo-brutalist system, shared via `@gnovium/shared` |
| Animation | framer-motion 12 + prism-react-renderer |
| Icons | lucide-react |
| Data | 22 TypeScript module files + OpenAPI 3.0.3 spec |
| Shared Navbar | `@gnovium/shared/components/UniversalNavbar` with docs variant |
| Design System | `packages/shared/styles/base.css` (imported via globals.css) |
| Deploy | Static export or Vercel |

---

## Quick Start

```bash
npm install
```

```bash
# Standalone (default port 3000)
npm run dev -w docs

# Or via the unified proxy (auto-routes to /api/v1/docs on port 3000)
npm run dev
```

Build for production:

```bash
npm run build -w docs     # Generates OpenAPI spec, then builds Next.js
```

| Command | Action |
|---------|--------|
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run generate:openapi` | Regenerate `public/openapi.json` + `.yaml` |

---

## Proxy Routing

When accessed through the unified proxy (`npm run dev` from root):

| External | Internal | App |
|----------|----------|-----|
| `http://localhost:3000/api/v1/docs` | `http://localhost:3102` | Docs (port 3102) |

The `basePath: /api/v1/docs` in `next.config.ts` ensures asset URLs are correct behind the proxy. When running standalone, `NEXT_PUBLIC_BASE_PATH` should be empty.

---

---

## Architecture

### Navigation Bar

The docs navbar uses `UniversalNavbar` from `@gnovium/shared/components/UniversalNavbar.tsx` with the **docs variant**. It includes:

- Logo + "GNOVIUM DOCS" badge
- Creator credit: "Created by Gaurav Kaloliya"
- API health indicator: "API Healthy 3/114"
- Star, Download, and Search buttons (via `DocsRightSlot`)
- Theme toggle
- No nav items (the docs sidebar handles navigation)

### Data Flow (Build Time)

```
src/data/modules/*.ts          — 22 module files, each exports Endpoint[]
        │
        ▼
src/data/index.ts              — Combines all modules into ENDPOINTS[] + MODULES[]
        │
        ▼
src/app/page.tsx               — Imports at build time, renders 100% static HTML
  ├── Sidebar                  — Module tree navigation
  ├── SearchPalette            — Cmd+K full-text search (client-side, pre-indexed)
  └── Module sections          — Endpoint cards rendered inline
```

There are **no runtime API calls for documentation**. Everything is compiled at `next build` time. The only live network request comes from `ApiPlayground.tsx` when a user clicks "Send Request" — it fires against `NEXT_PUBLIC_API_URL`.

### Route Map

| Route | Page | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Main documentation — all 22 modules, sidebar, search |
| `/changelog` | `changelog/page.tsx` | Full version history (v0.5.0 → v4.0.0) |
| `/error-catalog` | `error-catalog/page.tsx` | 17 standardized error codes |
| `/download` | `download/page.tsx` | OpenAPI spec downloads (JSON, YAML) |

### Dual Rendering Architecture

The main page (`page.tsx`) contains **two separate render trees** in a single file:

- **Desktop (~1200 lines):** Persistent sidebar + scrollable content area
- **Mobile (~500 lines):** Accordion module list + bottom tab bar + full-screen detail panel

This avoids client-side waterfall routing and keeps the entire docs site as a single static page load.

### Provider Hierarchy

```
layout.tsx (server)
  ├─ <Script> theme-init        — prevents hydration flash
  └─ ThemeProvider (client)
       ├─ Navigation            — UniversalNavbar + API health status
       ├─ Sidebar / MobileDocs  — Module tree (desktop) / accordion (mobile)
       ├─ SearchPalette         — Cmd+K modal
       ├─ <main>{children}</main>
       └─ Footer
```

---

## CSS Architecture

The docs site uses the shared design system:

```
docs/src/app/globals.css (4 lines)
  ├── @import "tailwindcss"
  ├── @source packages/shared/components/  (scans shared components for Tailwind classes)
  ├── @source packages/shared/index.ts
  └── @import "../../../packages/shared/styles/base.css"  (832 lines — all theme tokens, utilities)
```

---

## 22 Modules · 114 Endpoints

| Module | Endpoints | Deployment |
|--------|-----------|------------|
| System | 1 | Both |
| Auth | 8 | Cloud only |
| Workspaces | 6 | Both |
| Entities | 15 | Both |
| Tags | 7 | Both |
| Blocks | 8 | Both |
| Relations | 8 | Both |
| Comments | 5 | Both |
| Branches | 6 | Both |
| Versions | 9 | Both |
| Diffs | 1 | Both |
| Search | 1 | Pending |
| AI | 1 | Pending |
| Files | 9 | Both (presign cloud-only) |
| Graph | 5 | Both |
| Sync | 7 | Both |
| Activity | 1 | Both |
| Governance | 5 | Pending |
| Notifications | 3 | Both |
| Jobs | 4 | Cloud only |
| Dashboard | 1 | Both |
| Backups | 3 | Both |
| **Total** | **114** | **95 both + 12 cloud-only + 7 pending** |

---

## OpenAPI Spec Generation

The build script `scripts/generate-openapi.ts`:

1. Imports `ENDPOINTS` from `src/data/index.ts` (single source of truth)
2. Converts TypeScript `Endpoint` objects to OpenAPI operations
3. Applies manually curated request body schemas
4. Generates `public/openapi.json` and `public/openapi.yaml`
5. Runs before `next build` via the `build` script (uses `tsx` for TypeScript execution)

Regenerate manually:

```bash
npm run generate:openapi
```

The spec includes:
- **114 operations** across **83 paths**
- **9 shared schemas** (Pagination, Error, User, Workspace, etc.)
- **3 security schemes** (Access Token, Refresh Token, API Key)

---

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `Navigation` | `src/components/Navigation.tsx` | Wraps `UniversalNavbar` (docs variant) with API health status + DocsRightSlot |
| `ThemeProvider` | `src/components/ThemeProvider.tsx` | 6-theme context + toggle/cycle |
| `Sidebar` | `src/components/Sidebar.tsx` | Desktop module navigation tree with scroll-spy |
| `SearchPalette` | `src/components/SearchPalette.tsx` | Cmd+K modal — full-text search across all endpoints (fuse.js, pre-indexed) |
| `ApiPlayground` | `src/components/ApiPlayground.tsx` | Live "Send Request" panel with response viewer |
| `MobileDocs` | `src/components/MobileDocs.tsx` | Mobile accordion module list + bottom tab navigation |
| `UniversalNavbar` | `packages/shared/components/UniversalNavbar.tsx` | Shared navbar component with variant system |

---

## Theme System

Six themes (identical across all apps):

| Class | Name |
|-------|------|
| `:root` | Light |
| `.dark` | Dark |
| `.sepia` | Sepia |
| `.high-contrast` | High Contrast |
| `.ocean` | Ocean |
| `.midnight` | Midnight |

---

## Deployment

Builds as standalone output:

```bash
npm run build -w docs
# Output: .next/ (standalone)
```

---

## Contributing a Module

1. Create `src/data/modules/<name>.ts` exporting an array of `Endpoint` objects
2. Add the export to `src/data/index.ts`
3. Add an icon in `src/data/icons.tsx`
4. Regenerate OpenAPI spec: `npm run generate:openapi`
5. Verify: `npm run dev -w docs` → check sidebar + content + search

---

## Related

- [Root README](../README.md) — Full project overview, architecture, API docs
- [Shared Package](../packages/shared/README.md) — UniversalNavbar, base.css design system
- [Cloud Web](../cloud-web/README.md) — Web dashboard (auth gateway)
- [Landing](../landing/README.md) — Marketing landing page
- [Backend](../backend/README.md) — Flask API (114 endpoints, 22 modules)
