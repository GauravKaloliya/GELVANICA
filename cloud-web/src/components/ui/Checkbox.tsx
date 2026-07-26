"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
  description?: string;
}

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, description, ...props }, ref) => {
  const checkbox = (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded border border-border bg-surface",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-accent data-[state=checked]:text-foreground data-[state=checked]:border-accent",
        "data-[state=indeterminate]:bg-surface-2 data-[state=indeterminate]:text-foreground data-[state=indeterminate]:border-border",
        "transition-colors",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === "indeterminate" ? (
          <Minus className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (label || description) {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="mt-0.5">{checkbox}</div>
        <div className="flex-1">
          {label && <p className="text-sm font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</p>}
          {description && <p className="text-xs text-muted mt-1">{description}</p>}
        </div>
      </label>
    );
  }

  return checkbox;
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
export type { CheckboxProps };
