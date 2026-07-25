import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
type BadgeSize = "default" | "sm" | "lg";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-zinc-800 text-zinc-300 border-zinc-700",
  secondary: "bg-zinc-800/50 text-zinc-400 border-transparent",
  destructive: "bg-red-500/10 text-red-400 border-red-500/20",
  outline: "bg-transparent text-zinc-400 border-zinc-700",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const sizeStyles: Record<BadgeSize, string> = {
  default: "h-5 px-2 text-[11px]",
  sm: "h-4 px-1.5 text-[10px]",
  lg: "h-6 px-2.5 text-xs",
};

function Badge({
  variant = "default",
  size = "default",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-green-400",
            variant === "warning" && "bg-amber-400",
            variant === "destructive" && "bg-red-400",
            variant === "info" && "bg-blue-400",
            variant === "default" && "bg-zinc-400",
            variant === "secondary" && "bg-zinc-500",
            variant === "outline" && "bg-zinc-500"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant, BadgeSize };
