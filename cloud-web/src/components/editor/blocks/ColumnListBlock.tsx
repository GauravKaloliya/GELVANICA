"use client";
import { Columns2, Columns3, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnListBlockProps {
  content: { columns?: number };
  onChange: (content: { columns: number }) => void;
  readOnly?: boolean;
}

const columnOptions = [2, 3, 4] as const;

export default function ColumnListBlock({ content, onChange, readOnly }: ColumnListBlockProps) {
  const columns = content.columns || 2;

  return (
    <div className="rounded-lg border border-border/50 bg-surface/10 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Layout className="h-3.5 w-3.5 text-muted" />
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Column Layout</span>
        </div>
        {!readOnly && (
          <div className="flex gap-1">
            {columnOptions.map((n) => (
              <button
                key={n}
                onClick={() => onChange({ columns: n })}
                className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]",
                    columns === n
                      ? "bg-surface text-foreground"
                      : "text-muted hover:text-foreground"
                )}
              >
                {n === 2 ? <Columns2 className="h-3 w-3" /> : n === 3 ? <Columns3 className="h-3 w-3" /> : null}
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-4")}>
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="rounded border border-dashed border-border p-2 text-center">
            <span className="text-[10px] text-muted">Column {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
