'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { UniversalNavbar, LandingRightSlot, getNavItems } from '@gnovium/shared';

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const container = document.querySelector('.smooth-scroll-container');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { root: container, rootMargin: '-40% 0px -55% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const sectionIdFromHref = (href: string) => href.replace(/^\/?#/, '');

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = sectionIdFromHref(href);
    const el = document.getElementById(id);
    if (el) {
      const container = document.querySelector('.smooth-scroll-container');
      if (container) {
        const top = el.getBoundingClientRect().top + container.scrollTop - 80;
        container.scrollTo({ top, behavior: 'smooth' });
      }
    } else {
      window.location.href = href;
    }
  };

  const isAnchorActive = (href: string) => activeSection === sectionIdFromHref(href);

  return (
    <UniversalNavbar
      variant="landing"
      navItems={getNavItems('landing')}
      theme={theme}
      onToggleTheme={toggle}
      pathname={pathname}
      rightSlot={<LandingRightSlot />}
      onAnchorClick={handleAnchorClick}
      isAnchorActive={isAnchorActive}
    />
  );
}
