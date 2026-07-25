"use client";

import { cn } from "@/lib/utils";
import { Search, Grid3X3, List } from "lucide-react";

interface FileToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function FileToolbar({ searchQuery, onSearchChange, viewMode, onViewModeChange }: FileToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter files..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
      </div>
      <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/50">
        <button
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "rounded-l-lg p-2 transition-colors",
            viewMode === "grid" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
          aria-label="Grid view"
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={cn(
            "rounded-r-lg p-2 transition-colors",
            viewMode === "list" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
