"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  GitBranch,
  Check,
  ChevronDown,
  Plus,
  Star,
} from "lucide-react";
import type { Branch } from "@/lib/types";

interface BranchSelectorProps {
  branches: Branch[];
  currentBranchId?: string;
  onSelectBranch?: (branchId: string) => void;
  onCreateBranch?: (name: string) => void;
  className?: string;
}

export default function BranchSelector({
  branches,
  currentBranchId,
  onSelectBranch,
  onCreateBranch,
  className,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [creating, setCreating] = useState(false);

  const currentBranch = branches.find((b) => b.id === currentBranchId);

  const handleCreate = () => {
    const trimmed = newBranchName.trim();
    if (!trimmed || !onCreateBranch) return;
    onCreateBranch(trimmed);
    setNewBranchName("");
    setCreating(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          open
            ? "bg-white text-black"
            : "bg-zinc-800 text-zinc-400 hover:text-white"
        )}
      >
        <GitBranch className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate">
          {currentBranch?.name ?? "Branch"}
        </span>
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl">
          {branches.map((branch) => {
            const isActive = branch.id === currentBranchId;
            return (
              <button
                key={branch.id}
                onClick={() => {
                  onSelectBranch?.(branch.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors",
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                )}
              >
                {isActive ? (
                  <Check size={14} className="shrink-0 text-white" />
                ) : (
                  <GitBranch size={14} className="shrink-0 text-zinc-600" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-medium">
                      {branch.name}
                    </span>
                    {branch.is_default && (
                      <Star
                        size={10}
                        className="shrink-0 fill-zinc-500 text-zinc-500"
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    {formatRelativeTime(branch.created_at)}
                  </span>
                </div>
              </button>
            );
          })}

          <div className="my-1 h-px bg-zinc-800" />

          {creating ? (
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <input
                autoFocus
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="branch-name"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
              />
              <button
                onClick={handleCreate}
                disabled={!newBranchName.trim()}
                className="rounded-md bg-white px-2 py-1 text-xs font-medium text-black disabled:opacity-40"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-zinc-500 transition-colors hover:text-white"
            >
              <Plus size={14} className="shrink-0" />
              <span className="text-xs font-medium">New branch</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
