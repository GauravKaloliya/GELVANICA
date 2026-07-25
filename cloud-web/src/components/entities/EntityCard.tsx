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
  file: "bg-zinc-500/10 text-zinc-400",
};

export default function EntityCard({
  entity,
  workspaceId,
  className,
  isSelected = false,
  hasSelection = false,
  onToggleSelect,
}: EntityCardProps) {
  const typeColor = ENTITY_TYPE_COLORS[entity.entity_type_id] || "bg-zinc-500/10 text-zinc-400";

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
        "group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900",
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
            <h3 className="truncate text-sm font-medium text-white group-hover:text-blue-400">
              {entity.title || "Untitled"}
            </h3>
            {entity.properties && Object.keys(entity.properties).length > 0 && (
              <p className="mt-1 truncate text-[11px] text-zinc-500">
                {Object.entries(entity.properties)
                  .slice(0, 2)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(" · ")}
              </p>
            )}
            <p className="mt-1.5 text-[10px] text-zinc-600">
              Updated {formatRelativeTime(entity.updated_at)}
            </p>
          </div>
          <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
        </div>
      </Link>
    </div>
  );
}
