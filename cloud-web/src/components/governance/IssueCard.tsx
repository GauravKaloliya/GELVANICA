"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Copy, Clock, Link, Type, HardDrive } from "lucide-react";

export type IssueCategory = "duplicate" | "orphan" | "stale" | "broken_link" | "naming" | "size";

interface IssueCardProps {
  category: IssueCategory;
  title: string;
  description?: string;
  entityTitle?: string;
  entityId?: string;
  onClick?: () => void;
  className?: string;
}

const CATEGORY_CONFIG: Record<IssueCategory, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  duplicate: { icon: Copy, color: "text-amber-400", bg: "bg-amber-500/10", label: "Duplicate" },
  orphan: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", label: "Orphan" },
  stale: { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10", label: "Stale" },
  broken_link: { icon: Link, color: "text-orange-400", bg: "bg-orange-500/10", label: "Broken Link" },
  naming: { icon: Type, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Naming" },
  size: { icon: HardDrive, color: "text-purple-400", bg: "bg-purple-500/10", label: "Size Warning" },
};

export default function IssueCard({ category, title, description, entityTitle, onClick, className }: IssueCardProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border-border bg-card p-3 text-left transition-colors card-hover hover-glow",
        className
      )}
    >
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", config.bg)}>
        <Icon className={cn("h-3.5 w-3.5", config.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", config.bg, config.color)}>
            {config.label}
          </span>
          {entityTitle && (
            <span className="truncate text-[11px] text-muted">{entityTitle}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-white truncate">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted truncate">{description}</p>}
      </div>
    </button>
  );
}
