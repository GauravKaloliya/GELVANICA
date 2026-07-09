# Gnovium Landing Page

> Marketing landing page for the Gnovium Knowledge Operating System — neo-brutalist, animated, scroll-snapping.

| | |
|---|---|
| Framework | Next.js 16 (App Router) — standalone output |
| Runtime | React 19 + TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 — 6-theme neo-brutalist system, shared via `@gnovium/shared` |
| Animation | framer-motion 12 — whileInView reveals, staggered springs, whileHover pop-up |
| Icons | lucide-react |
| Design System | `packages/shared/styles/base.css` (832 lines — shared foundation) |

---

## Quick Start

```bash
npm install
```

```bash
# Standalone (default port 3000)
npm run dev -w landing

# Or via the unified proxy (port 3000, auto-routes all apps)
npm run dev
```

```bash
npm run build -w landing    # production build
```

---

## Project Structure

```
landing/
├── .gitignore
├── eslint.config.mjs         # ESLint flat config (9.x)
├── next.config.ts            # standalone output, unoptimized images
├── package.json              # Deps: @gnovium/shared, framer-motion, lucide-react
├── postcss.config.mjs        # Tailwind v4 PostCSS plugin
├── tsconfig.json             # TypeScript strict, @/ path alias
├── vercel.json               # Vercel deployment config + security headers
├── Dockerfile                # Docker build for containerized deployment
│
├── public/
│   └── images/
│       ├── founder.png       # Founder photo (converted from JPEG for WebP output)
│       └── ...               # Landing page images and assets
│
└── src/
    ├── app/
    │   ├── globals.css       # Tailwind imports + @source directives + scroll-snap styles
    │   ├── layout.tsx        # Root layout: ThemeProvider → Navbar → page
    │   └── page.tsx          # Single-page landing: Hero → Features → HowItWorks → ...
    │
    └── components/
        ├── Hero.tsx           # Animated hero with delayed spring variants
        ├── Features.tsx       # Feature cards with whileHover pop-up
        ├── HowItWorks.tsx     # Step-by-step explanation
        ├── AboutSection.tsx   # About the creator
        ├── FoundSection.tsx   # Founder section (references /images/founder.png)
        ├── AISection.tsx      # AI capabilities showcase
        ├── Platform.tsx       # Platform/multi-platform section
        ├── WhoItsFor.tsx      # Target audience section
        ├── PositioningStats.tsx  # Merged: PositioningStrip + StatsStrip
        ├── DualModeSection.tsx   # Merged: DualMode + SameModelStrip
        ├── Navbar.tsx         # Landing-specific navbar (anchor links, scroll spy)
        ├── Footer.tsx         # Site footer
        ├── ThemeProvider.tsx  # 6-theme context (dark/light/sepia/high-contrast/ocean/midnight)
        ├── ParticleGraph.tsx  # Canvas-based animated graph background
        └── RevealSection.tsx  # Shared whileInView reveal wrapper (docs-aligned pattern)
```

---

## Animation Architecture

All landing animations are aligned to the docs site's exact patterns:

| Pattern | Value |
|---------|-------|
| Reveal | `whileInView` (not `useInView` + `animate`) — framer-motion manages intersection internally |
| Stagger | `delayChildren: 0.05`, `staggerChildren: 0.03` |
| Card spring | `stiffness: 150`, `damping: 20`, `y: 10` |
| Hero delay | Individual delayed springs matching docs values |
| Hover | `whileHover={{ scale: 1.02 }}` on all card motion.divs |
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` |

---

## Theme System

Six themes inherited from the shared design system (`packages/shared/styles/base.css`):

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

## Component History

Two components were merged during consolidation:

- **PositioningStrip + StatsStrip → `PositioningStats.tsx`** — Same content rendered in a single card
- **DualMode + SameModelStrip → `DualModeSection.tsx`** — "One knowledge model. Two deployment modes." rendered as bottom banner inside the same `RevealSection`

The original files (`PositioningStrip.tsx`, `StatsStrip.tsx`, `DualMode.tsx`, `SameModelStrip.tsx`) remain in the directory but are no longer imported from `page.tsx`.

---

## Build

```bash
npm run build -w landing
# Output: .next/ (standalone)
```

Or build all three Next.js apps together:

```bash
npm run build:all
```

---

## Deployment

- **Vercel**: Configured via `vercel.json` (clean URLs, security headers)
- **Docker**: `Dockerfile` at root builds standalone output
- **Proxy**: Served at `/` through `tools/proxy.mjs` (port 3000) alongside frontend, docs, and backend

---

## Related

- [Root README](../README.md) — Full project overview, architecture, API docs
- [Shared Package](../packages/shared/README.md) — UniversalNavbar, base.css design system
- [Docs](../docs/README.md) — API documentation portal
- [Frontend](../frontend/README.md) — Web dashboard (auth gateway)
- [Backend](../backend/README.md) — Flask API (111 endpoints, 22 modules)
