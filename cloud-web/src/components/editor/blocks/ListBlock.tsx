"use client";

import { cn } from "@/lib/utils";

interface ListBlockProps {
  blockType: "bulleted_list" | "numbered_list";
  content: { text: string };
  onChange: (content: { text: string }) => void;
  position?: number;
  readOnly?: boolean;
}

export default function ListBlock({ blockType, content, onChange, position, readOnly }: ListBlockProps) {
  const isBulleted = blockType === "bulleted_list";

  return (
    <div className="flex items-start gap-2">
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 text-zinc-500", isBulleted ? "rounded-full bg-current" : "")}>
        {!isBulleted && <span className="text-xs">{position ?? 1}.</span>}
      </span>
      <input
        type="text"
        value={content.text || ""}
        onChange={(e) => onChange({ text: e.target.value })}
        readOnly={readOnly}
        placeholder={isBulleted ? "List item" : "List item"}
        className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
      />
    </div>
  );
}
