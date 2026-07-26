"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { Skeleton } from "@/components/ui/Skeleton";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading, tokens } = useSession();
  const { fetchWorkspace } = useWorkspaceStore();
  const { sidebarCollapsed } = useUIStore();
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isOnline, wasOffline } = useOnlineStatus();
  const {
    isOpen: isPaletteOpen,
    commands,
    close: closePalette,
    executeCommand,
  } = useCommandPalette();

  useKeyboardShortcuts();

  const workspaceId = params.id as string;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }
    const token = tokens?.access_token;
    if (token && workspaceId) {
      fetchWorkspace(token, workspaceId).finally(() => setIsLoading(false));
    }
  }, [isAuthenticated, authLoading, workspaceId, fetchWorkspace, router, tokens?.access_token]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" variant="circular" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const paletteItems = commands.map((cmd) => ({
    id: cmd.id,
    label: cmd.label,
    description: cmd.description,
    shortcut: cmd.shortcut,
    group: cmd.category,
    onSelect: () => executeCommand(cmd),
  }));

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <ErrorBoundary fallback={<div className="flex h-screen w-64 items-center justify-center bg-background"><p className="text-xs text-muted">Sidebar error</p></div>}>
        <Sidebar workspaceId={workspaceId} />
      </ErrorBoundary>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        workspaceId={workspaceId}
      />

      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <TopNav workspaceId={workspaceId} />

        <main role="main" className="flex-1 overflow-y-auto" id="main-content">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette
        open={isPaletteOpen}
        onClose={closePalette}
        items={paletteItems}
        placeholder="Type a command or search..."
      />

      {wasOffline && isOnline && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-green-500/30 bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 shadow-lg">
          Back online. Syncing changes...
        </div>
      )}
      {!isOnline && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 shadow-lg">
          You&apos;re offline. Changes will sync when reconnected.
        </div>
      )}
    </div>
  );
}
