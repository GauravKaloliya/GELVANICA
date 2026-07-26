"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { RotateCcw, Circle } from "lucide-react";
import type { EntityVersion } from "@/lib/types";

interface VersionTimelineProps {
  versions: EntityVersion[];
  currentVersionId?: string;
  onSelectVersion?: (versionId: string) => void;
  onRestore?: (versionId: string) => void;
  className?: string;
}

export default function VersionTimeline({
  versions,
  currentVersionId,
  onSelectVersion,
  onRestore,
  className,
}: VersionTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted">
          No versions yet. Versions are created automatically as you edit.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative space-y-0", className)}>
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface" />

      {versions.map((version, i) => {
        const isCurrent = currentVersionId === version.id;
        const isHovered = hoveredId === version.id;
        const isLast = i === versions.length - 1;

        return (
          <div
            key={version.id}
            className="relative flex items-start gap-3 pl-0 py-2"
            onMouseEnter={() => setHoveredId(version.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              onClick={() => onSelectVersion?.(version.id)}
              className={cn(
                "relative z-10 mt-1 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                isCurrent
                  ? "border-white bg-white"
                  : "border-border bg-card hover:border-accent"
              )}
              aria-label={`Select version ${version.id.slice(0, 8)}`}
            >
              {isCurrent && (
                <Circle size={6} className="fill-black text-black" />
              )}
            </button>

            <div
              className={cn(
                "flex-1 min-w-0 rounded-lg border px-3 py-2 transition-colors",
                isCurrent
                  ? "border-border bg-surface/60"
                  : "border-transparent hover:border-border hover:bg-card"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    v{version.id.slice(0, 8)}
                    {version.changeset_id && (
                      <span className="ml-2 text-muted">
                        cs:{version.changeset_id.slice(0, 6)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {formatRelativeTime(version.created_at)}
                  </p>
                </div>

                {onRestore && (isHovered || isCurrent) && !isLast && (
                  <button
                    onClick={() => onRestore(version.id)}
                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
