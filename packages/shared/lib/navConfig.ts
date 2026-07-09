import type { NavItemConfig } from '../components/UniversalNavbar';
import { Routes, docsUrl, frontendUrl, toAnchorHash, toExternalUrl } from '../lib';

export type Variant = 'landing' | 'frontend' | 'docs';

const LANDING_NAV: NavItemConfig[] = [
  { type: 'anchor', href: toAnchorHash(Routes.landing.features.build({})), label: 'Features' },
  { type: 'anchor', href: toAnchorHash(Routes.landing.ai.build({})), label: 'AI' },
  { type: 'anchor', href: toAnchorHash(Routes.landing.platform.build({})), label: 'Platform' },
  { type: 'anchor', href: toAnchorHash(Routes.landing.whoItsFor.build({})), label: "Who It's For" },
  { type: 'anchor', href: toAnchorHash(Routes.landing.about.build({})), label: 'About' },
  { type: 'internal', href: Routes.landing.download.build({}), label: 'Download' },
  { type: 'external', href: toExternalUrl(docsUrl()), label: 'Documentation' },
];

const FRONTEND_NAV: NavItemConfig[] = [
  { type: 'internal', href: Routes.frontend.home.build({}), label: 'Home' },
  { type: 'external', href: toExternalUrl(docsUrl()), label: 'Documentation' },
];

const DOCS_NAV: NavItemConfig[] = [];

const NAV_MAP: Record<Variant, NavItemConfig[]> = {
  landing: LANDING_NAV,
  frontend: FRONTEND_NAV,
  docs: DOCS_NAV,
};

export function getNavItems(variant: Variant): NavItemConfig[] {
  return NAV_MAP[variant];
}

export interface MobileDefaultConfig {
  href?: string;
  label?: string;
}

export const mobileDefault: Record<Variant, MobileDefaultConfig | undefined> = {
  landing: { href: frontendUrl(), label: 'Get Started' },
  frontend: undefined,
  docs: undefined,
};
