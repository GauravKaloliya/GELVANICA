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
        "peer h-4 w-4 shrink-0 rounded border border-zinc-700 bg-zinc-800/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-white data-[state=checked]:text-black data-[state=checked]:border-white",
        "data-[state=indeterminate]:bg-zinc-600 data-[state=indeterminate]:text-white data-[state=indeterminate]:border-zinc-600",
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
          {label && <p className="text-sm font-medium text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</p>}
          {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
        </div>
      </label>
    );
  }

  return checkbox;
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
export type { CheckboxProps };
