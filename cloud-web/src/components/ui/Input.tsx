"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted",
            "focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors",
            error
              ? "border-red-500 focus:ring-red-400"
              : "border-border hover:border-border",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted",
          "focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none transition-colors",
          error
            ? "border-red-500 focus:ring-red-400"
            : "border-border hover:border-border",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
export type { InputProps, TextareaProps };
