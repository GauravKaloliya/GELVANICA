'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { useTheme } from './ThemeProvider';
import { getAvatarUrl } from '@/lib/utils/avatar';
import {
  UniversalNavbar,
  CloudWebRightSlot,
  CloudWebMobileAuthSlot,
  getNavItems,
} from '@gnovium/shared';

export default function Navbar() {
  const { user, isLoading, logout } = useSession();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/auth/sign-in");
  };

  return (
    <UniversalNavbar
      variant="cloud-web"
      navItems={getNavItems('cloud-web')}
      theme={theme}
      onToggleTheme={toggle}
      pathname={pathname}
      rightSlot={
        <CloudWebRightSlot
          user={user ? { name: user.name ?? undefined, email: user.email, avatar_url: user.avatar_url ?? undefined } : null}
          isLoading={isLoading}
          pathname={pathname}
          onLogout={handleLogout}
          getAvatarUrl={getAvatarUrl}
        />
      }
      mobileBottomSlot={(onClose) => (
        <CloudWebMobileAuthSlot
          user={user ? { name: user.name ?? undefined, email: user.email, avatar_url: user.avatar_url ?? undefined } : null}
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
