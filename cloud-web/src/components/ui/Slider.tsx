"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, label, showValue, formatValue, ...props }, ref) => {
  const value = (props.defaultValue || props.value || [0]) as number[];
  const displayValue = formatValue ? formatValue(value[0]) : value[0];

  if (label || showValue) {
    return (
      <div className="space-y-2">
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && <label className="text-sm font-medium text-muted">{label}</label>}
            {showValue && <span className="text-xs font-mono text-muted">{displayValue}</span>}
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          className={cn("relative flex w-full touch-none select-none items-center", className)}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface">
            <SliderPrimitive.Range className="absolute h-full bg-accent" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-border bg-card shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
        </SliderPrimitive.Root>
      </div>
    );
  }

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-border bg-card shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = "Slider";

export { Slider };
export type { SliderProps };
