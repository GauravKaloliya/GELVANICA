"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon" | "xs";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: "accent-bg hover:bg-accent/90 active:bg-accent/80 neo-depth-btn",
  destructive: "bg-red-600 text-foreground hover:bg-red-700 active:bg-red-800 neo-depth-btn",
  outline: "border border-border bg-transparent text-muted hover:bg-surface hover:text-foreground active:bg-surface-2 neo-depth-btn",
  secondary: "bg-surface text-muted hover:bg-surface-2 hover:text-foreground active:bg-surface neo-depth-btn",
  ghost: "text-muted hover:bg-surface hover:text-foreground active:bg-surface-2 neo-depth-btn",
  link: "text-muted underline-offset-4 hover:underline hover:text-foreground",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2 text-sm font-medium",
  sm: "h-8 rounded-md px-3 text-xs font-medium",
  lg: "h-10 rounded-lg px-6 text-sm font-semibold",
  icon: "h-9 w-9 p-0",
  xs: "h-7 rounded-md px-2 text-xs font-medium",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          "select-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
