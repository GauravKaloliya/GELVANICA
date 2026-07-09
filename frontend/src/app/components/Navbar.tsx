'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { useTheme } from './ThemeProvider';
import { getAvatarUrl } from '@/lib/avatar';
import {
  UniversalNavbar,
  FrontendRightSlot,
  FrontendMobileAuthSlot,
  Routes,
  getNavItems,
} from '@gnovium/shared';

export default function Navbar() {
  const { user, isLoading, logout } = useSession();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push(Routes.frontend.signIn.build({}));
  };

  return (
    <UniversalNavbar
      variant="frontend"
      navItems={getNavItems('frontend')}
      theme={theme}
      onToggleTheme={toggle}
      pathname={pathname}
      rightSlot={
        <FrontendRightSlot
          user={user ? { name: user.name, email: user.email, avatar_url: user.avatar_url ?? undefined } : null}
          isLoading={isLoading}
          pathname={pathname}
          onLogout={handleLogout}
          getAvatarUrl={getAvatarUrl}
        />
      }
      mobileBottomSlot={(onClose) => (
        <FrontendMobileAuthSlot
          user={user ? { name: user.name, email: user.email, avatar_url: user.avatar_url ?? undefined } : null}
          isLoading={isLoading}
          pathname={pathname}
          onLogout={handleLogout}
          onClose={onClose}
          getAvatarUrl={getAvatarUrl}
        />
      )}
    />
  );
}
