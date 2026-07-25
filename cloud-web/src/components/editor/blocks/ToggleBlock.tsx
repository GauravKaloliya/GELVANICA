"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ToggleBlockProps {
  content: { text: string; open?: boolean };
  onChange: (content: { text: string; open: boolean }) => void;
  children?: React.ReactNode;
  readOnly?: boolean;
}

export default function ToggleBlock({ content, onChange, children, readOnly }: ToggleBlockProps) {
  const [open, setOpen] = useState(content.open ?? false);

  return (
    <div className="rounded-md border border-zinc-800">
      <button
        onClick={() => {
          const newOpen = !open;
          setOpen(newOpen);
          if (!readOnly) onChange({ ...content, open: newOpen });
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/50"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
            open && "rotate-90"
          )}
        />
        <input
          type="text"
          value={content.text || ""}
          onChange={(e) => !readOnly && onChange({ ...content, text: e.target.value, open })}
          readOnly={readOnly}
          placeholder="Toggle title"
          className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
          onClick={(e) => e.stopPropagation()}
        />
      </button>
      {open && (
        <div className="border-t border-zinc-800 px-6 py-3">
          {children || (
            <p className="text-xs text-zinc-600 italic">Empty toggle. Add content here.</p>
          )}
        </div>
      )}
    </div>
  );
}
