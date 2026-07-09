'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';
import SearchPalette from '@/components/SearchPalette';
import { UniversalNavbar, DocsRightSlot, getNavItems } from '@gnovium/shared';

export default function Navigation() {
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <UniversalNavbar
        variant="docs"
        navItems={getNavItems('docs')}
        theme={theme}
        onToggleTheme={toggle}
        docsApiStatus={{ healthy: true }}
        rightSlot={<DocsRightSlot onSearchOpen={() => setSearchOpen(true)} />}
      />
      <AnimatePresence>
        {searchOpen && (
          <SearchPalette onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
