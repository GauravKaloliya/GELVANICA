"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Entity } from "@/lib/types";
import { FileText, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";

interface EntityListProps {
  entities: Entity[];
  workspaceId: string;
  emptyMessage?: string;
  className?: string;
  selectedIds?: string[];
  hasSelection?: boolean;
  onToggleSelect?: (id: string, shiftKey: boolean, metaKey: boolean) => void;
}

export default function EntityList({
  entities,
  workspaceId,
  emptyMessage,
  className,
  selectedIds = [],
  hasSelection = false,
  onToggleSelect,
}: EntityListProps) {
  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-10 w-10 text-muted" />
        <p className="mt-3 text-sm text-muted">{emptyMessage || "No entities yet"}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {entities.map((entity) => {
        const isSelected = selectedIds.includes(entity.id);
        return (
          <div
            key={entity.id}
            className={cn(
              "group flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-surface",
              isSelected && "bg-white/5"
            )}
            onClick={(e) => {
              if ((e.metaKey || e.ctrlKey || e.shiftKey) && onToggleSelect) {
                e.preventDefault();
                onToggleSelect(entity.id, e.shiftKey, e.metaKey || e.ctrlKey);
              }
            }}
          >
            {(hasSelection || isSelected) && onToggleSelect && (
              <div
                className="mr-3 shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSelect(entity.id, e.shiftKey, e.metaKey || e.ctrlKey);
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(entity.id, false, false)}
                />
              </div>
            )}

            <Link
              href={`/workspace/${workspaceId}/entity/${entity.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                  e.preventDefault();
                }
              }}
            >
              <span className="text-sm">{entity.icon || "📄"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground group-hover:text-blue-400">
                  {entity.name || "Untitled"}
                </p>

              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[10px] text-muted">
                {formatRelativeTime(entity.updated_at)}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted group-hover:text-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
