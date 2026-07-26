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
        "flex flex-col items-center justify-center py-16 px-4 text-center grid-bg",
        className
      )}
    >
      {Icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface mb-4">
          <Icon className="h-6 w-6 text-muted" />
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground display-heading">{title}</h3>
      {description && (
        <p className="mt-1 text-step-3 text-muted max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
            "accent-bg neo-depth-btn transition-colors",
            "hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
