"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  children?: React.ReactNode;
  className?: string;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, children, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      {Icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800/50 mb-4">
          <Icon className="h-6 w-6 text-zinc-500" />
        </div>
      )}
      <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
            "bg-white text-zinc-900 shadow-sm transition-colors",
            "hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          )}
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  )
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
export type { EmptyStateProps };
