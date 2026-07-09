# Gnovium Documentation Portal

> **111 endpoints · 80 routes · 22 modules — documented, demonstrable, deployable.**

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

## Project Structure

```
docs/
├── .env                      # ApiPlayground API base URL
├── .env.local                # NEXT_PUBLIC_BASE_PATH=/api/v1/docs
├── .env.production           # Production overrides
├── .gitignore
├── next.config.ts            # basePath via env, standalone output, unoptimized images
├── next-env.d.ts             # Auto-generated Next.js type declarations
├── eslint.config.mjs         # ESLint flat config (9.x)
├── postcss.config.mjs        # Tailwind v4 PostCSS plugin
├── package.json              # Scripts: build triggers OpenAPI gen first
├── tsconfig.json             # TypeScript strict, @/ path alias
│
├── scripts/
│   └── generate-openapi.ts   # Builds openapi.json + openapi.yaml from TS endpoint data
│
├── public/
│   ├── openapi.json          # Auto-generated OpenAPI 3.0.3 spec (111 ops, 80 paths)
│   ├── openapi.yaml          # YAML equivalent
│   ├── api-version.json      # Version manifest (v1.0.1)
│   ├── favicon.ico           # Site favicon
│   ├── images/
│   │   └── founder.png       # Founder photo
│   └── logo/
│       └── gnovium.jpeg      # Brand logo
│
└── src/
    ├── app/
    │   ├── globals.css       # Imports: tailwindcss + @gnovium/shared/styles/base.css
    │   ├── layout.tsx        # Root layout + metadata + theme init script
    │   ├── page.tsx          # Main docs page (dual desktop/mobile render trees)
    │   ├── not-found.tsx     # 404 page
    │   ├── changelog/page.tsx    # Version changelog (v0.5.0 → v4.0.0)
    │   ├── download/page.tsx     # OpenAPI spec download page
    │   └── error-catalog/
    │       └── page.tsx      # Error catalog (17 standardized codes)
    │
    ├── components/           # 15 shared + app-specific components
    │   ├── ThemeProvider.tsx      # 6-theme context
    │   ├── Sidebar.tsx           # Desktop module navigation tree
    │   ├── SearchPalette.tsx     # Cmd+K modal search across all docs
    │   ├── ApiPlayground.tsx     # Interactive "Send Request" panel
    │   ├── Navigation.tsx        # Wraps UniversalNavbar (docs variant) + API status
    │   ├── Footer.tsx            # Site footer with links
    │   ├── Breadcrumbs.tsx       # Breadcrumb trail
    │   ├── PageWrapper.tsx       # Shared page layout wrapper
    │   ├── ErrorBoundary.tsx     # React error boundary with fallback UI
    │   ├── MobileDocs.tsx        # Mobile accordion + tab navigation
    │   ├── ParticleGraph.tsx     # Canvas-based animated graph background
    │   ├── SchemaTree.tsx        # JSON schema tree viewer
    │   ├── BackToTop.tsx         # Scroll-to-top FAB
    │   ├── SkipToContent.tsx     # Accessibility skip link
    │   └── Tooltip.tsx           # Hover tooltip
    │
    └── data/
        ├── index.ts              # ENDPOINTS[] + MODULES[] — combines all module files
        ├── types.ts              # Endpoint, Module, ChangelogEntry, ErrorEntry types
        ├── common.ts             # Shared schemas, base URLs, headers
        ├── icons.tsx             # Module icon components (lucide-react wrappers)
        ├── auth-guide.ts         # Auth modes, OAuth2 PKCE, API keys, PATs
        ├── changelog.ts          # Full changelog data (v0.5.0 → v4.0.0)
        ├── error-catalog.ts      # 17 error codes with descriptions, causes, fixes
        └── modules/              # 22 module files
            ├── system.ts         #   System (health)
            ├── auth.ts           #   Auth (register, login, OAuth, tokens)
            ├── workspaces.ts     #   Workspaces (CRUD + stats)
            ├── entities.ts       #   Entities (pages, documents, types, properties)
            ├── tags.ts           #   Tags
            ├── blocks.ts         #   Blocks (content fragments)
            ├── relations.ts      #   Relations (knowledge graph edges)
            ├── comments.ts       #   Comments (threaded discussions)
            ├── branches.ts       #   Branches (Git-inspired)
            ├── versions.ts       #   Versions (changesets + snapshots)
            ├── diffs.ts          #   Diffs (visual comparison)
            ├── search.ts         #   Search (full-text, semantic, hybrid)
            ├── ai.ts             #   AI (Inference Runtime queries)
            ├── files.ts          #   Files (upload, download, presign)
            ├── graph.ts          #   Graph (materialize, query, traverse)
            ├── sync.ts           #   Sync (offline operations)
            ├── activity.ts       #   Activity (audit trail)
            ├── governance.ts     #   Governance (health, duplicates, orphans)
            ├── notifications.ts  #   Notifications
            ├── jobs.ts           #   Jobs (async operations)
            ├── dashboard.ts      #   Dashboard (overview stats)
            └── backups.ts        #   Backups (export/import)
```

---

## Architecture

### Navigation Bar

The docs navbar uses `UniversalNavbar` from `@gnovium/shared/components/UniversalNavbar.tsx` with the **docs variant**. It includes:

- Logo + "GNOVIUM DOCS" badge
- Creator credit: "Created by Gaurav Kaloliya"
- API health indicator: "API Healthy 3/106"
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

## 22 Modules · 111 Endpoints

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
| Versions | 9 | Cloud only |
| Diffs | 1 | Cloud only |
| Search | 1 | Both |
| AI | 1 | Both |
| Files | 9 | Both |
| Graph | 5 | Both |
| Sync | 4 | Cloud only |
| Activity | 1 | Both |
| Governance | 5 | Both |
| Notifications | 3 | Both |
| Jobs | 4 | Cloud only |
| Dashboard | 1 | Both |
| Backups | 3 | Both |
| **Total** | **111** | **83 both + 28 cloud-only** |

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
- **111 operations** across **80 paths**
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
- [Frontend](../frontend/README.md) — Web dashboard (auth gateway)
- [Landing](../landing/README.md) — Marketing landing page
- [Backend](../backend/README.md) — Flask API (111 endpoints, 22 modules)
