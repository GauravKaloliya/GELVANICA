"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Entity } from "@/lib/types";
import { ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";

interface EntityCardProps {
  entity: Entity;
  workspaceId: string;
  className?: string;
  isSelected?: boolean;
  hasSelection?: boolean;
  onToggleSelect?: (id: string, shiftKey: boolean, metaKey: boolean) => void;
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  page: "bg-blue-500/10 text-blue-400",
  note: "bg-green-500/10 text-green-400",
  task: "bg-amber-500/10 text-amber-400",
  document: "bg-purple-500/10 text-purple-400",
  bookmark: "bg-cyan-500/10 text-cyan-400",
  file: "bg-surface text-muted",
};

export default function EntityCard({
  entity,
  workspaceId,
  className,
  isSelected = false,
  hasSelection = false,
  onToggleSelect,
}: EntityCardProps) {
  const typeColor = ENTITY_TYPE_COLORS[entity.entity_type_id] || "bg-surface text-muted";

  const handleClick = (e: React.MouseEvent) => {
    if (!onToggleSelect) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect(entity.id, e.shiftKey, e.metaKey || e.ctrlKey);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect?.(entity.id, e.shiftKey, e.metaKey || e.ctrlKey);
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-card-border bg-card p-4 transition-all neo-depth-zinc card-hover hover-glow",
        isSelected && "border-white/40 bg-white/5",
        className
      )}
      onClick={handleClick}
    >
      {(hasSelection || isSelected) && onToggleSelect && (
        <div className="absolute right-2 top-2 z-10">
          <div onClick={handleCheckboxClick}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(entity.id, false, false)}
            />
          </div>
        </div>
      )}

      <Link
        href={`/workspace/${workspaceId}/entity/${entity.id}`}
        className="block"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) {
            e.preventDefault();
          }
        }}
      >
        {entity.cover_image && (
          <div className="mb-3 overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entity.cover_image}
              alt=""
              className="h-32 w-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", typeColor)}>
            <span className="text-sm">{entity.icon || "📄"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-foreground group-hover:text-blue-400 display-heading">
              {entity.name || "Untitled"}
            </h3>

            <p className="mt-1.5 text-[10px] text-muted">
              Updated {formatRelativeTime(entity.updated_at)}
            </p>
          </div>
          <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted group-hover:text-foreground" />
        </div>
      </Link>
    </div>
  );
}
