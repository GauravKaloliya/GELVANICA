"use client";

import Link from "next/link";
import { Search, Settings, Menu } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { UserAvatarMenu } from "@/components/shared/UserAvatarMenu";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { Button } from "@/components/ui/Button";
import { TooltipWrapper } from "@/components/ui/Tooltip";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface TopNavProps {
  workspaceId: string;
}

export function TopNav({ workspaceId }: TopNavProps) {
  const { toggleSidebar } = useUIStore();

  return (
    <header role="banner" aria-label="Top navigation" className="flex h-14 shrink-0 items-center gap-4 border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-3">
        <WorkspaceSwitcher />

        <Button
          variant="outline"
          size="sm"
          onClick={() => useUIStore.getState().setSearchOpen(true)}
          className="gap-2 text-zinc-500 hover:text-zinc-300"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-zinc-700 px-1 py-0.5 text-[10px] text-zinc-600 sm:inline">
            ⌘K
          </kbd>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <NotificationBell />

        <TooltipWrapper content="Settings">
          <Button variant="ghost" size="icon" asChild aria-label="Settings">
            <Link href={`/workspace/${workspaceId}/settings`}>
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </TooltipWrapper>

        <UserAvatarMenu />
      </div>
    </header>
  );
}
