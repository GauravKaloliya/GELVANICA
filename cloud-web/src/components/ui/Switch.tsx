"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  label?: string;
  description?: string;
}

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, label, description, ...props }, ref) => {
  const switchEl = (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-700",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-zinc-900 shadow-lg ring-0",
          "transition-transform",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitives.Root>
  );

  if (label || description) {
    return (
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <div className="flex-1">
          {label && <p className="text-sm font-medium text-white">{label}</p>}
          {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
        </div>
        {switchEl}
      </label>
    );
  }

  return switchEl;
});
Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };
