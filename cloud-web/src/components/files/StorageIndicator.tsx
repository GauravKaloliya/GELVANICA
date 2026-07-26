"use client";

import { cn, formatFileSize } from "@/lib/utils";

interface StorageIndicatorProps {
  usedBytes: number;
  totalBytes: number;
  variant?: "bar" | "text" | "detailed";
  className?: string;
}

function getStorageColor(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent > 60) return "bg-amber-500";
  return "bg-card";
}

export function StorageIndicator({
  usedBytes,
  totalBytes,
  variant = "bar",
  className,
}: StorageIndicatorProps) {
  const percent = totalBytes > 0 ? Math.min((usedBytes / totalBytes) * 100, 100) : 0;
  const colorClass = getStorageColor(percent);

  if (variant === "text") {
    return (
      <span className={cn("text-xs text-muted", className)}>
        {formatFileSize(usedBytes)} of {formatFileSize(totalBytes)} used
      </span>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={cn("rounded-lg border-border bg-card neo-depth-zinc p-3", className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Storage</span>
          <span className="text-muted">
            {formatFileSize(usedBytes)} / {formatFileSize(totalBytes)}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className={cn("h-full rounded-full transition-all", colorClass)}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-[10px] text-muted">
          {percent.toFixed(1)}%
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
