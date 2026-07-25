"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

type ProgressVariant = "default" | "success" | "warning" | "error" | "info";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: ProgressVariant;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  formatValue?: (value: number) => string;
}

const variantStyles: Record<ProgressVariant, string> = {
  default: "bg-white",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

const sizeStyles: Record<string, string> = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2.5",
};

function getAutoVariant(value: number): ProgressVariant {
  if (value >= 90) return "success";
  if (value >= 60) return "info";
  if (value >= 30) return "warning";
  return "error";
}

function Progress({
  value = 0,
  variant,
  showValue = false,
  size = "md",
  formatValue,
  className,
  ...props
}: ProgressProps) {
  const safeValue = value ?? 0;
  const computedVariant = variant || getAutoVariant(safeValue);
  const displayValue = formatValue ? formatValue(safeValue) : `${Math.round(safeValue)}%`;

  return (
    <div className="w-full">
      {showValue && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Progress</span>
          <span className="text-xs font-mono text-zinc-400">{displayValue}</span>
        </div>
      )}
      <ProgressPrimitive.Root
        className={cn("relative w-full overflow-hidden rounded-full bg-zinc-800", sizeStyles[size], className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
            variantStyles[computedVariant]
          )}
          style={{ transform: `translateX(-${100 - safeValue}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}

function CircularProgress({
  value = 0,
  size = 48,
  strokeWidth = 4,
  variant,
  className,
}: {
  value?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressVariant;
  className?: string;
}) {
  const computedVariant = variant || getAutoVariant(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const colorMap: Record<ProgressVariant, string> = {
    default: "stroke-white",
    success: "stroke-green-500",
    warning: "stroke-amber-500",
    error: "stroke-red-500",
    info: "stroke-blue-500",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500 ease-out", colorMap[computedVariant])}
        />
      </svg>
      <span className="absolute text-xs font-bold text-white">{Math.round(value)}</span>
    </div>
  );
}

export { Progress, CircularProgress };
export type { ProgressProps, ProgressVariant };
