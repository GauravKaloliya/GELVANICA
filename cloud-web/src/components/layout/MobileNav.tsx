"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Link2,
  Upload,
  Tag,
  Shield,
  Activity,
  RefreshCw,
  Settings,
  Users,
  Brain,
  Plus,
} from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Sheet, SheetHeader, SheetContent } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "search", label: "Search", icon: Search },
  { href: "graph", label: "Knowledge Graph", icon: Link2 },
  { href: "files", label: "Files", icon: Upload },
  { href: "tags", label: "Tags", icon: Tag },
  { href: "governance", label: "Governance", icon: Shield },
  { href: "activity", label: "Activity", icon: Activity },
  { href: "sync", label: "Sync", icon: RefreshCw },
  { href: "settings", label: "Settings", icon: Settings },
  { href: "settings/members", label: "Members", icon: Users },
  { href: "settings/ai", label: "AI Config", icon: Brain },
];

export function MobileNav({ open, onClose, workspaceId }: MobileNavProps) {
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspaceStore();

  return (
    <Sheet open={open} onClose={onClose} side="left">
      <SheetHeader onClose={onClose}>
        <div>
          <p className="text-sm font-semibold text-white">{currentWorkspace?.name || "Workspace"}</p>
          <p className="text-[11px] text-muted">{currentWorkspace?.deployment_mode || "cloud"}</p>
        </div>
      </SheetHeader>
      <SheetContent>
        <Button variant="default" className="w-full justify-start gap-2 mb-4" asChild>
          <Link href={`/workspace/${workspaceId}/entity/new`} onClick={onClose}>
            <Plus className="h-4 w-4" />
            New Entity
          </Link>
        </Button>
        <Separator className="mb-2" />
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const href = `/workspace/${workspaceId}/${item.href}`;
              const isActive = pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-surface text-foreground"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
