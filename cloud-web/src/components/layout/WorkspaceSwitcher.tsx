"use client";

import Link from "next/link";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace } = useWorkspaceStore();

  if (!currentWorkspace) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 px-3 text-foreground hover:text-foreground"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded bg-surface-2 text-[10px] font-bold text-foreground">
            {currentWorkspace.name?.[0]?.toUpperCase() || "W"}
          </div>
          <span className="max-w-[140px] truncate text-sm font-medium">
            {currentWorkspace.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-64">
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} asChild>
              <Link
                href={`/workspace/${workspace.id}/dashboard`}
                className="gap-3"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-2 text-[10px] font-bold text-foreground">
                  {workspace.name?.[0]?.toUpperCase() || "W"}
                </div>
                <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                {workspace.id === currentWorkspace.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/workspaces" className="gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-dashed border-border">
              <Plus className="h-3 w-3 text-muted" />
            </div>
            <span>Create workspace</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
