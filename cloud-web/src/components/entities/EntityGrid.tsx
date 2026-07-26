"use client";

import EntityCard from "./EntityCard";
import type { Entity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

interface EntityGridProps {
  entities: Entity[];
  workspaceId: string;
  emptyMessage?: string;
  className?: string;
  selectedIds?: string[];
  hasSelection?: boolean;
  onToggleSelect?: (id: string, shiftKey: boolean, metaKey: boolean) => void;
}

export default function EntityGrid({
  entities,
  workspaceId,
  emptyMessage,
  className,
  selectedIds = [],
  hasSelection = false,
  onToggleSelect,
}: EntityGridProps) {
  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Layers className="h-10 w-10 text-muted" />
        <p className="mt-3 text-sm text-muted">{emptyMessage || "No entities yet"}</p>
        <p className="mt-1 text-xs text-muted">Create your first entity to get started</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {entities.map((entity) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          workspaceId={workspaceId}
          isSelected={selectedIds.includes(entity.id)}
          hasSelection={hasSelection}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
