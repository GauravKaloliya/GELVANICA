"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatsCard({ label, value, icon: Icon, color, trend, className }: StatsCardProps) {
  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900/50 p-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", color.replace("text-", "bg-").replace("400", "500/10"))}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value.toLocaleString()}</p>
      {trend && (
        <p className={cn("mt-1 text-[11px] font-medium", trend.isPositive ? "text-green-400" : "text-red-400")}>
          {trend.isPositive ? "+" : ""}{trend.value}% from last month
        </p>
      )}
    </div>
  );
}
