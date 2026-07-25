"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface HealthScoreProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: 64,
  md: 96,
  lg: 128,
};

function getColor(score: number): string {
  if (score < 40) return "#ef4444";
  if (score < 70) return "#eab308";
  return "#22c55e";
}

function getColorClass(score: number): string {
  if (score < 40) return "text-red-400";
  if (score < 70) return "text-yellow-400";
  return "text-green-400";
}

export function HealthScore({
  score,
  label = "Health Score",
  size = "md",
  showLabel = true,
  className,
}: HealthScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const dimension = SIZE_MAP[size];
  const strokeWidth = size === "sm" ? 4 : size === "md" ? 6 : 8;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = getColor(score);
  const colorClass = getColorClass(score);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setAnimatedScore(score);
    });
    return () => cancelAnimationFrame(timer);
  }, [score]);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg
          width={dimension}
          height={dimension}
          className="rotate-[-90deg]"
        >
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-bold tabular-nums",
              colorClass,
              size === "sm" && "text-sm",
              size === "md" && "text-lg",
              size === "lg" && "text-2xl"
            )}
          >
            {Math.round(animatedScore)}
          </span>
        </div>
      </div>
      {showLabel && (
        <p
          className={cn(
            "font-medium text-zinc-500",
            size === "sm" && "text-[10px]",
            size === "md" && "text-xs",
            size === "lg" && "text-sm"
          )}
        >
          {label}
        </p>
      )}
    </div>
  );
}

export default HealthScore;
