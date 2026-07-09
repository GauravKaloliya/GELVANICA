'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook for cross-app navigation with proper browser history handling.
 * Uses pushState for same-origin cross-app links so back-button works.
 */
export function useCrossAppRouter() {
  const router = useRouter();

  const navigateCrossApp = useCallback(
    (href: string) => {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const targetUrl = href.startsWith('http') ? href : `${currentOrigin}${href}`;

      // If same origin, use pushState + full page navigation
      if (targetUrl.startsWith(currentOrigin)) {
        window.history.pushState({ crossApp: true }, '', href);
        window.location.href = href;
      } else {
        // External URL — open in new tab
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    },
    [router],
  );

  return { navigateCrossApp };
}
