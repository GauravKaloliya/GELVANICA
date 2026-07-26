"use client";
import { cn } from "@/lib/utils";

interface ColumnBlockProps {
  content?: Record<string, unknown>;
  onChange?: (content: Record<string, unknown>) => void;
  children?: React.ReactNode;
  readOnly?: boolean;
}

export default function ColumnBlock({ children }: ColumnBlockProps) {
  return (
    <div className={cn(
      "min-h-[60px] rounded-md border border-dashed border-border/50",
      "bg-surface/5 p-2"
    )}>
      {children}
    </div>
  );
}
