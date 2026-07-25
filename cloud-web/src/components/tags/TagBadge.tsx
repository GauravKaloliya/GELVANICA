"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface TagBadgeProps {
  name: string;
  color?: string | null;
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function TagBadge({ name, color, size = "sm", removable, onRemove, onClick, className }: TagBadgeProps) {
  const bgColor = color || "#6b7280";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        onClick && "cursor-pointer hover:opacity-80",
        className
      )}
      style={{ backgroundColor: `${bgColor}20`, color: bgColor, border: `1px solid ${bgColor}30` }}
      onClick={onClick}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: bgColor }} />
      {name}
      {removable && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-white/10"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
