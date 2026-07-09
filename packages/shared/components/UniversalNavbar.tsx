'use client';

import { useState, useEffect, useRef, useMemo, useId, memo, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Sun, Moon, Menu, X, LogIn, ArrowRight, LogOut, UserPlus,
  ChevronDown, Search, ExternalLink, Download, Command,
} from 'lucide-react';
import type { AppRoute, AnchorHash, ExternalUrl } from '../lib/routes';
import { Routes, frontendUrl, docsUrl, landingUrl, mobileDefault, toExternalUrl } from '../lib';
import gnoviumLogoImg from '../assets/logo/logo.png';

const gnoviumLogoSrc = gnoviumLogoImg.src || gnoviumLogoImg;

/* ─── Types ─────────────────────────────────── */

export type NavItemConfig = {
  label: string;
} & (
  | { type: 'internal'; href: AppRoute }
  | { type: 'external'; href: ExternalUrl }
  | { type: 'crossApp'; href: AppRoute }
  | { type: 'anchor'; href: AnchorHash }
);

type Variant = 'landing' | 'frontend' | 'docs';

export interface UniversalNavbarProps {
  variant: Variant;
  navItems: NavItemConfig[];
  theme: string;
  onToggleTheme: () => void;
  /** Slot rendered at the right end of the desktop nav bar (after creator credit + theme toggle) */
  rightSlot: ReactNode;
  /** Extra content below the nav items + theme toggle in the mobile drawer (receives close callback) */
  mobileBottomSlot?: ReactNode | ((onClose: () => void) => ReactNode);
  /** Called when an anchor nav item is clicked (landing smooth scroll) */
  onAnchorClick?: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  /** Whether a given anchor href is the active section */
  isAnchorActive?: (href: string) => boolean;
  /** Current pathname for non-anchor nav item active detection */
  pathname?: string;
  /** Override href for the logo link */
  logoHref?: string;
  /** Override aria-label for the logo link */
  logoAriaLabel?: string;
  /** API health status shown in the docs navbar */
  docsApiStatus?: { healthy: boolean };
}

/* ─── Client-only interactive boundary components (hydration optimization) ─── */

function ThemeToggleButton({ theme, onToggleTheme, mounted }: { theme: string; onToggleTheme: () => void; mounted: boolean }) {
  if (!mounted) return <div className="p-2.5 w-[42px] h-[42px]" />;
  return (
    <button
      onClick={onToggleTheme}
      className="p-2.5 rounded-none border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] cursor-pointer bg-[var(--card-bg)]"
      aria-label={`Current theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}

function MobileToggleButton({
  isOpen,
  onClick,
  hamburgerRef,
  mobileNavId,
}: {
  isOpen: boolean;
  onClick: () => void;
  hamburgerRef: React.RefObject<HTMLButtonElement | null>;
  mobileNavId: string;
}) {
  return (
    <button
      ref={hamburgerRef}
      onClick={onClick}
      className="md:hidden p-2.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] cursor-pointer bg-[var(--card-bg)]"
      aria-expanded={isOpen}
      aria-controls={mobileNavId}
      aria-haspopup="menu"
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
    >
      {isOpen ? (
        <X className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <Menu className="h-4 w-4" strokeWidth={2.5} />
      )}
    </button>
  );
}

/* ─── Theme icon helper (shared across all variants) ─── */
function ThemeIcon({ theme }: { theme: string }) {
  if (theme === 'dark') return <Moon className="h-4 w-4" strokeWidth={2.5} />;
  if (theme === 'light') return <Sun className="h-4 w-4" strokeWidth={2.5} />;
  if (theme === 'sepia') return <span className="text-xs font-black">S</span>;
  if (theme === 'high-contrast') return <span className="text-xs font-black">HC</span>;
  if (theme === 'ocean') return <span className="text-xs font-black">🌊</span>;
  return <span className="text-xs font-black">🌙</span>;
}

/* ─── Hooks ──────────────────────────────────── */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLDivElement | null>, triggerRef: React.RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    container.addEventListener('keydown', handler);

    return () => {
      container.removeEventListener('keydown', handler);
      if (previouslyFocused && previouslyFocused !== document.body) {
        previouslyFocused.focus();
      }
    };
  }, [open, containerRef]);
}

/* ─── Variant defaults ──────────────────────── */
const VARIANT_META: Record<Variant, { position: string; badge: string; logoAria: string }> = {
  landing: { position: 'fixed', badge: 'APP', logoAria: 'Gnovium Home' },
  frontend: { position: 'fixed', badge: 'APP', logoAria: 'Gnovium App Home' },
  docs: { position: 'sticky', badge: 'DOCS', logoAria: 'Gnovium Docs Home' },
};

/* ─── Nav item link renderer ─────────────────── */
const NavLink = memo(function NavLink({
  item,
  active,
  className,
  onClick,
  onKeyDown,
  tabIndex,
  role,
}: {
  item: NavItemConfig;
  active: boolean;
  className: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  tabIndex?: number;
  role?: string;
}) {
  const base =
    'font-mono text-step-0 font-black uppercase tracking-wider transition-colors ' + className;

  const sharedProps = {
    role,
    tabIndex,
    onKeyDown,
    'aria-current': active ? 'page' as const : undefined,
  };

  if (item.type === 'external') {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} inline-flex items-center gap-1.5`}
        {...sharedProps}
      >
        {item.label}
        <ExternalLink className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} />
      </a>
    );
  }

  if (item.type === 'anchor') {
    return (
      <a href={item.href} onClick={onClick} className={base} {...sharedProps}>
        {item.label}
      </a>
    );
  }

  if (item.type === 'crossApp') {
    return (
      <a
        href={item.href}
        className={base}
        onClick={(e) => {
          e.preventDefault();
          if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin;
            if (item.href.startsWith(currentOrigin)) {
              window.history.pushState({ crossApp: true }, '', item.href);
            }
          }
          window.location.href = item.href;
        }}
        {...sharedProps}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${base} ${active ? 'border-b-2 border-[var(--foreground)] pb-1' : ''}`}
      {...sharedProps}
    >
      {item.label}
    </Link>
  );
});

/* ─── Universal Navbar ───────────────────────── */
export default function UniversalNavbar({
  variant,
  navItems,
  theme,
  onToggleTheme,
  rightSlot,
  mobileBottomSlot,
  onAnchorClick,
  isAnchorActive,
  pathname,
  logoHref,
  logoAriaLabel,
  docsApiStatus,
}: UniversalNavbarProps) {
  const meta = VARIANT_META[variant];
  const ariaLabel = logoAriaLabel ?? meta.logoAria;
  const logoHrefResolved = logoHref ?? '/';

  const reducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const mobileNavId = useId();

  useFocusTrap(isOpen, mobileMenuRef, hamburgerRef);

  useEffect(() => {
    const onScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollProgress(height > 0 ? (winScroll / height) * 100 : 0);
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ── active detection ─── */
  const isActive = (item: NavItemConfig): boolean => {
    if (item.type === 'anchor' && isAnchorActive) return isAnchorActive(item.href);
    if ((item.type === 'internal' || item.type === 'crossApp') && pathname) {
      if (item.type === 'crossApp') {
        try {
          const url = new URL(item.href);
          const basePath = url.pathname.replace(/\/$/, '');
          if (!basePath) return false;
          return pathname.startsWith(basePath);
        } catch {
          return false;
        }
      }
      return pathname === item.href;
    }
    return false;
  };

  /* ── nav link wrapper ─── */
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItemConfig) => {
    if (item.type === 'anchor' && onAnchorClick) {
      onAnchorClick(e, item.href);
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
  };

  /* ── Memoized nav items ─── */
  const renderedNavItems = useMemo(() => {
    if (navItems.length === 0) return null;
    return (
      <div className="hidden md:flex items-center gap-6">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item)}
            className={
              isActive(item)
                ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] pb-1'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }
            onClick={(e) => handleLinkClick(e, item)}
          />
        ))}
      </div>
    );
  }, [navItems, pathname, isAnchorActive]);

  /* ── Mobile keyboard nav ─── */
  const mobileItems = navItems;
  const handleMobileKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      hamburgerRef.current?.focus();
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(mobileItems.length - 1);
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    setFocusedIndex((prev) => {
      if (e.key === 'ArrowDown') return prev < mobileItems.length - 1 ? prev + 1 : 0;
      return prev > 0 ? prev - 1 : mobileItems.length - 1;
    });
  };

  useEffect(() => {
    if (!isOpen) setFocusedIndex(-1);
  }, [isOpen]);

  return (
    <>
      {/* Scroll progress bar */}
      <div
        className="scroll-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      <nav
        className={`${meta.position} top-0 left-0 right-0 z-40 w-full border-b-2 border-[var(--border)] transition-all duration-200 ${
          scrolled
            ? 'bg-[var(--nav-bg)]/95 backdrop-blur-md shadow-[0_1px_0_0_var(--border)]'
            : 'bg-[var(--nav-bg)]'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* ── Left: Logo ───────────────────────────── */}
            <div className="flex items-center gap-6 shrink-0">
              <Link
                href={logoHrefResolved}
                className="flex items-center gap-3 group"
                aria-label={ariaLabel}
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] shadow-[3px_3px_0px_0px_var(--shadow-color)] transition-all group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-none flex items-center justify-center">
                  <img
                    src={gnoviumLogoSrc}
                    alt="Gnovium"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-step-3 font-black tracking-widest text-[var(--foreground)] transition-colors group-hover:opacity-70 uppercase font-mono">
                  GNOVIUM{' '}
                  {meta.badge && (
                    <span className="text-step-0 font-black px-2 py-0.5 rounded-none bg-[var(--foreground)] text-[var(--background)] border-2 border-[var(--foreground)] ml-1 tracking-normal font-sans">
                      {meta.badge}
                    </span>
                  )}
                </span>
              </Link>
            </div>

            {/* ── Center: Nav items (Desktop) ──────────── */}
            {renderedNavItems}

            {/* ── Right: Actions (Desktop) ─────────────── */}
            <div className="hidden md:flex items-center gap-2.5 ml-auto">
              {docsApiStatus && (
                <>
                  <div className="hidden xl:flex items-center gap-2 mr-2">
                    <span className="flex items-center gap-1.5 font-mono text-step-0 font-black uppercase tracking-widest">
                      <span className={`w-1.5 h-1.5 rounded-none ${docsApiStatus.healthy ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      API
                    </span>
                    {docsApiStatus.healthy ? (
                      <span className="font-mono text-step-0 font-black uppercase tracking-widest text-emerald-400">Healthy</span>
                    ) : (
                      <span className="font-mono text-step-0 font-black uppercase tracking-widest text-rose-500">Unhealthy</span>
                    )}
                  </div>
                  <div className="hidden xl:block w-px h-4 bg-[var(--border)] mr-2" />
                </>
              )}

              {/* Theme toggle */}
              <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} mounted={mounted} />

              {/* Variant-specific right slot */}
              {rightSlot}
            </div>

            {/* ── Mobile hamburger ──────────────────────── */}
            <MobileToggleButton
              isOpen={isOpen}
              onClick={() => setIsOpen(!isOpen)}
              hamburgerRef={hamburgerRef}
              mobileNavId={mobileNavId}
            />
          </div>
        </div>

        {/* ── Mobile dropdown ──────────────────────────── */}
        {isOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-t-2 border-[var(--border)] bg-[var(--card-bg)] px-4 py-4 space-y-4"
            role="menu"
            aria-orientation="vertical"
            aria-label="Navigation menu"
            id={mobileNavId}
            onKeyDown={handleMobileKeyDown}
          >
            {/* Mobile nav items */}
            {mobileItems.length > 0 && (
              <div className="flex flex-col gap-3">
                {mobileItems.map((item, idx) => {
                  const active = isActive(item);
                  const focused = idx === focusedIndex;
                  const cls = `font-mono text-step-0 font-black uppercase tracking-wider px-2 py-1.5 border transition-colors ${
                    active
                      ? 'border-[var(--foreground)] bg-[var(--sunken-bg)] text-[var(--foreground)]'
                      : focused
                      ? 'border-[var(--muted)] bg-[var(--code-bg)] text-[var(--foreground)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`;

                  if (item.type === 'external') {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${cls} inline-flex items-center gap-1.5`}
                        role="menuitem"
                        tabIndex={focused ? 0 : -1}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setIsOpen(false)}
                        ref={(el) => {
                          if (focused && el) el.focus();
                        }}
                      >
                        {item.label}
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} />
                      </a>
                    );
                  }

                  if (item.type === 'anchor') {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className={cls}
                        role="menuitem"
                        tabIndex={focused ? 0 : -1}
                        aria-current={active ? 'page' : undefined}
                        onClick={(e) => handleLinkClick(e, item)}
                        ref={(el) => {
                          if (focused && el) el.focus();
                        }}
                      >
                        {item.label}
                      </a>
                    );
                  }

                  if (item.type === 'crossApp') {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className={cls}
                        role="menuitem"
                        tabIndex={focused ? 0 : -1}
                        aria-current={active ? 'page' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          setIsOpen(false);
                          window.history.pushState({ crossApp: true }, '', item.href);
                          window.location.href = item.href;
                        }}
                        ref={(el) => {
                          if (focused && el) el.focus();
                        }}
                      >
                        {item.label}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cls}
                      role="menuitem"
                      tabIndex={focused ? 0 : -1}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {navItems.length > 0 && <hr className="border-t-2 border-[var(--border)]" />}

            {/* Mobile theme toggle */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-step-0 font-black uppercase tracking-wider text-[var(--muted)]">
                Theme
              </span>
              <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} mounted={mounted} />
            </div>

            {/* Variant-specific mobile bottom slot */}
            {typeof mobileBottomSlot === 'function'
              ? mobileBottomSlot(() => setIsOpen(false))
              : mobileBottomSlot ?? (
                  mobileDefault[variant] && (
                    <a
                      href={mobileDefault[variant]!.href!}
                      className="flex items-center justify-center gap-1.5 font-mono text-step-0 font-black uppercase tracking-wider py-2.5 border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] neo-depth-btn"
                    >
                      <ArrowRight size={13} strokeWidth={2.5} />
                      <span>{mobileDefault[variant]!.label ?? 'Get Started'}</span>
                    </a>
                  )
                )}
          </div>
        )}
      </nav>
    </>
  );
}

/* ─── Convenience slot creators ─────────────── */

/** Docs right slot: Search + Download link */
export function DocsRightSlot({
  onSearchOpen,
  downloadHref = landingUrl(Routes.landing.download.build({})),
  githubHref = 'https://github.com/GauravKaloliya/gnovium',
}: {
  onSearchOpen: () => void;
  downloadHref?: string;
  githubHref?: string;
}) {
  return (
    <>
      <button
        onClick={onSearchOpen}
        className="md:hidden p-2.5 rounded-none border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] cursor-pointer"
        aria-label="Search endpoints"
      >
        <Search className="h-4 w-4" strokeWidth={2.5} />
      </button>

      <button
        onClick={onSearchOpen}
        className="hidden md:flex items-center justify-between w-64 lg:w-80 rounded-none bg-[var(--card-bg)] border-2 border-[var(--border)] px-3 py-2.5 text-xs text-[var(--foreground)] font-bold transition-all neo-depth-btn cursor-pointer"
        aria-label="Search endpoints"
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 stroke-[2.5] text-[var(--muted)]" />
          <span className="font-mono text-[var(--muted)] text-step-0">
            Search everything...
          </span>
        </div>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-none border border-[var(--border)] bg-[var(--card-bg)] px-1.5 font-mono text-step-0 font-medium text-[var(--muted)]">
          <Command className="h-2.5 w-2.5" />
          K
        </kbd>
      </button>

      <a
        href={downloadHref}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--foreground)] text-step-0 font-black font-mono uppercase tracking-wider bg-[var(--foreground)] text-[var(--background)] hover:opacity-80 transition-all neo-depth-btn"
      >
        <Download className="h-3 w-3 stroke-[2.5]" />
        Download
      </a>
    </>
  );
}

/** Landing right slot: Get Started button */
export function LandingRightSlot({ href = frontendUrl() }: { href?: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-[var(--foreground)] text-[11px] font-black font-mono uppercase tracking-wider bg-[var(--foreground)] text-[var(--background)] hover:opacity-85 transition-all neo-depth-btn"
    >
      <LogIn size={13} strokeWidth={2.5} />
      <span>Get Started</span>
    </a>
  );
}

/** Frontend auth right slot (sign-in / sign-up / user menu) */
export function FrontendRightSlot({
  user,
  isLoading,
  pathname,
  onLogout,
  getAvatarUrl,
  signInHref = Routes.frontend.signIn.build({}),
  signUpHref = Routes.frontend.signUp.build({}),
  workspaceHref = Routes.frontend.workspace.build({}),
}: {
  user: { name?: string; email?: string; avatar_url?: string } | null;
  isLoading: boolean;
  pathname: string;
  onLogout: () => void;
  getAvatarUrl: (seed: string) => string;
  signInHref?: string;
  signUpHref?: string;
  workspaceHref?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (isLoading) {
    return <div className="h-9 w-32 border-2 border-[var(--border)] bg-[var(--sunken-bg)] animate-pulse" />;
  }

  if (user) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-2 border-2 border-[var(--foreground)] text-step-0 font-black font-mono uppercase tracking-wider bg-[var(--card-bg)] text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all neo-depth-btn cursor-pointer"
        >
          <div className="relative h-4.5 w-4.5 rounded-none border border-[var(--foreground)] overflow-hidden shrink-0 bg-[var(--sunken-bg)]">
            <img
              src={user.avatar_url || getAvatarUrl(user.name || user.email || '')}
              alt="Profile avatar"
              className="h-full w-full object-cover"
            />
          </div>
          <span>{user.name}</span>
          <ChevronDown size={12} strokeWidth={2.5} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-[var(--card-bg)] border-2 border-[var(--foreground)] rounded-none shadow-[3px_3px_0px_0px_var(--shadow-color)] py-1.5 z-50">
            <div className="flex items-center gap-2.5 px-3.5 py-2 border-b-2 border-[var(--border)] bg-[var(--sunken-bg)] mb-1.5">
              <div className="relative h-7 w-7 rounded-none border border-[var(--foreground)] overflow-hidden shrink-0 bg-[var(--card-bg)]">
                <img
                  src={user.avatar_url || getAvatarUrl(user.name || user.email || '')}
                  alt="Profile avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-step-0 font-black font-mono uppercase text-[var(--foreground)] truncate">
                  {user.name}
                </div>
                <div className="text-[8px] font-bold font-mono text-[var(--muted)] truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <Link
              href={workspaceHref}
              className="block px-4 py-1.5 text-step-0 font-mono font-bold uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Workspace
            </Link>
            <hr className="border-t-2 border-[var(--border)] my-1.5" />
            <button
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-1.5 text-step-0 font-mono font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut size={12} className="inline mr-2" strokeWidth={2.5} />
              Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  const authButton = pathname === signInHref ? (
    <Link
      href={signUpHref}
      className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-[var(--foreground)] text-step-0 font-black font-mono uppercase tracking-wider bg-[var(--foreground)] text-[var(--background)] hover:opacity-85 transition-all neo-depth-btn"
    >
      <UserPlus size={13} strokeWidth={2.5} />
      <span>Sign Up</span>
    </Link>
  ) : (
    <Link
      href={signInHref}
      className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-[var(--foreground)] text-step-0 font-black font-mono uppercase tracking-wider bg-[var(--foreground)] text-[var(--background)] hover:opacity-85 transition-all neo-depth-btn"
    >
      <LogIn size={13} strokeWidth={2.5} />
      <span>Sign In</span>
    </Link>
  );

  return (
    <div className="flex items-center gap-2">
      {authButton}
      <Link
        href={landingUrl(Routes.landing.download.build({}))}
        className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-[var(--foreground)] text-step-0 font-black font-mono uppercase tracking-wider bg-[var(--card-bg)] text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all neo-depth-btn"
      >
        <Download size={13} strokeWidth={2.5} />
        <span>Download</span>
      </Link>
    </div>
  );
}

/** Frontend mobile auth slot */
export function FrontendMobileAuthSlot({
  user,
  isLoading,
  pathname,
  onLogout,
  onClose,
  getAvatarUrl,
  signInHref = Routes.frontend.signIn.build({}),
  signUpHref = Routes.frontend.signUp.build({}),
  workspaceHref = Routes.frontend.workspace.build({}),
}: {
  user: { name?: string; email?: string; avatar_url?: string } | null;
  isLoading: boolean;
  pathname: string;
  onLogout: () => void;
  onClose: () => void;
  getAvatarUrl: (seed: string) => string;
  signInHref?: string;
  signUpHref?: string;
  workspaceHref?: string;
}) {
  if (isLoading) return null;

  if (user) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2 py-1.5 border-b border-[var(--border)] pb-2.5 mb-1 bg-[var(--sunken-bg)]">
          <div className="relative h-8 w-8 rounded-none border border-[var(--foreground)] overflow-hidden shrink-0 bg-[var(--card-bg)]">
            <img
              src={user.avatar_url || getAvatarUrl(user.name || user.email || '')}
              alt="Profile avatar"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-step-0 font-black font-mono uppercase text-[var(--foreground)] truncate">
              {user.name}
            </div>
            <div className="text-step-0 font-bold font-mono text-[var(--muted)] truncate">
              {user.email}
            </div>
          </div>
        </div>
        <Link
          href={workspaceHref}
          className="block text-center font-mono text-step-0 font-black uppercase tracking-wider py-2 border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-[var(--foreground)] neo-depth-btn"
          onClick={onClose}
        >
          Workspace
        </Link>
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="block w-full text-center font-mono text-step-0 font-black uppercase tracking-wider py-2 border-2 border-rose-500 bg-rose-500/10 text-rose-500 cursor-pointer"
        >
          Logout
        </button>
      </div>
    );
  }

  const target = pathname === signInHref ? signUpHref : signInHref;
  const label = pathname === signInHref ? 'Sign Up' : 'Sign In';

  return (
    <Link
      href={target}
      className="block text-center font-mono text-step-0 font-black uppercase tracking-wider py-2 border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] neo-depth-btn"
      onClick={onClose}
    >
      {label}
    </Link>
  );
}
