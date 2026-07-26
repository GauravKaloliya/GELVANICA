"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ToDoBlockProps {
  content: { text: string; checked: boolean };
  onChange: (content: { text: string; checked: boolean }) => void;
  readOnly?: boolean;
}

export default function ToDoBlock({ content, onChange, readOnly }: ToDoBlockProps) {
  return (
    <div className="flex items-start gap-2">
      <button
        onClick={() => !readOnly && onChange({ ...content, checked: !content.checked })}
        disabled={readOnly}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          content.checked
            ? "border-blue-500 bg-blue-500 text-white"
            : "border-border bg-transparent hover:border-border/80"
        )}
      >
        {content.checked && <Check className="h-3 w-3" />}
      </button>
      <input
        type="text"
        value={content.text || ""}
        onChange={(e) => onChange({ ...content, text: e.target.value })}
        readOnly={readOnly}
        placeholder="To-do"
        className={cn(
          "flex-1 bg-transparent text-sm outline-none placeholder:text-muted",
          content.checked ? "text-muted line-through" : "text-foreground"
        )}
      />
    </div>
  );
}
