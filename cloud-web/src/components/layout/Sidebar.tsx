"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Search,
  Link2,
  Download,
  Upload,
  Tag,
  Shield,
  Activity,
  RefreshCw,
  Settings,
  Users,
  Brain,
  ChevronLeft,
  Plus,
  Clock,
  Archive,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { TooltipWrapper } from "@/components/ui/Tooltip";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { UserAvatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useIsMobile, useIsDesktop } from "@/hooks/useMediaQuery";

interface SidebarProps {
  workspaceId: string;
}

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "search", label: "Search", icon: Search },
  { href: "graph", label: "Knowledge Graph", icon: Link2 },
  { href: "files", label: "Files", icon: Upload },
  { href: "tags", label: "Tags", icon: Tag },
  { href: "recent", label: "Recent", icon: Clock },
  { href: "archive", label: "Archive", icon: Archive },
  { href: "governance", label: "Governance", icon: Shield },
  { href: "activity", label: "Activity", icon: Activity },
  { href: "sync", label: "Sync", icon: RefreshCw },
  { divider: true },
  { href: "settings", label: "Settings", icon: Settings },
  { href: "settings/members", label: "Members", icon: Users },
  { href: "settings/ai", label: "AI Config", icon: Brain },
] as const;

export function Sidebar({ workspaceId }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { currentWorkspace, members } = useWorkspaceStore();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  const displayMembers = members?.slice(0, 5) || [];
  const extraCount = (members?.length || 0) - 5;

  useEffect(() => {
    if (isMobile) {
      useUIStore.setState({ sidebarCollapsed: true, isMobile: true });
    } else if (isDesktop) {
      useUIStore.setState({ sidebarCollapsed: true, isMobile: false });
    } else {
      useUIStore.setState({ isMobile: false });
    }
  }, [isMobile, isDesktop]);

  return (
    <>
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside
        role="navigation"
        aria-label="Workspace navigation"
        className={cn(
          "left-0 top-0 z-50 flex h-full flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300 max-md:fixed max-md:z-50 max-md:shadow-2xl",
          sidebarCollapsed ? "w-16 -translate-x-full md:translate-x-0" : "w-64 md:translate-x-0"
        )}
      >
      {/* Workspace Header */}
      <div className="flex h-14 items-center gap-3 border-b border-zinc-800 px-4">
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {currentWorkspace?.name || "Workspace"}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {currentWorkspace?.deployment_mode || "cloud"}
            </p>
          </div>
        )}
        <TooltipWrapper content={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 h-8 w-8" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                sidebarCollapsed && "rotate-180"
              )}
            />
          </Button>
        </TooltipWrapper>
      </div>

      {/* New Entity */}
      <div className="p-2">
        {sidebarCollapsed ? (
          <TooltipWrapper content="New Entity" side="right">
            <Button variant="default" size="icon" className="w-full" asChild aria-label="New Entity">
              <Link href={`/workspace/${workspaceId}/entity/new`}>
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipWrapper>
        ) : (
          <Button variant="default" className="w-full justify-start gap-2" asChild>
            <Link href={`/workspace/${workspaceId}/entity/new`}>
              <Plus className="h-4 w-4 shrink-0" />
              <span>New Entity</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Quick Actions */}
      {!sidebarCollapsed && (
        <div className="flex gap-1 px-2">
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-xs" onClick={() => window.dispatchEvent(new CustomEvent("gnovium:import"))}>
            <Download className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-xs" onClick={() => window.dispatchEvent(new CustomEvent("gnovium:export"))}>
            <Upload className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="space-y-0.5 p-2">
          {NAV_ITEMS.map((item, index) => {
            if ("divider" in item && item.divider) {
              return <Separator key={`divider-${index}`} className="my-2" />;
            }

            const navItem = item as (typeof NAV_ITEMS)[number] & { href: string; label: string; icon: React.ElementType };
            const href = `/workspace/${workspaceId}/${navItem.href}`;
            const isActive = pathname === href || pathname.startsWith(href + "/");

            const linkContent = (
              <Link
                key={navItem.href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
                  sidebarCollapsed && "justify-center px-0"
                )}
              >
                <navItem.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{navItem.label}</span>}
              </Link>
            );

            return sidebarCollapsed ? (
              <TooltipWrapper key={navItem.href} content={navItem.label} side="right">
                {linkContent}
              </TooltipWrapper>
            ) : (
              <div key={navItem.href}>{linkContent}</div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Member Stack + Collapse */}
      <div className="border-t border-zinc-800 p-2 space-y-2">
        {!sidebarCollapsed && displayMembers.length > 0 && (
          <div className="px-2 py-1.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Members
            </p>
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {displayMembers.map((member) => (
                  <TooltipWrapper
                    key={member.id}
                    content={member.user?.name || "Unknown"}
                    side="right"
                  >
                    <div className="relative">
                      <UserAvatar
                        name={member.user?.name}
                        avatarUrl={member.user?.avatar_url}
                        size="sm"
                        className="ring-2 ring-zinc-950 h-6 w-6 text-[9px]"
                      />
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-zinc-950 bg-green-400" />
                    </div>
                  </TooltipWrapper>
                ))}
              </div>
              {extraCount > 0 && (
                <span className="ml-2 text-[11px] text-zinc-500">
                  +{extraCount} more
                </span>
              )}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={toggleSidebar}
          className="w-full justify-start gap-3"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              sidebarCollapsed && "rotate-180"
            )}
          />
          {!sidebarCollapsed && <span>Collapse</span>}
        </Button>
      </div>
      </aside>
    </>
  );
}
