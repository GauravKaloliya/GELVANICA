"use client";

import { useState } from "react";
import { Sigma } from "lucide-react";
import { cn } from "@/lib/utils";

interface EquationBlockProps {
  content: { text: string; display?: boolean };
  onChange: (content: { text: string; display?: boolean }) => void;
}

export default function EquationBlock({ content, onChange }: EquationBlockProps) {
  const [editing, setEditing] = useState(!content.text);
  const [draft, setDraft] = useState(content.text || "");

  const handleBlur = () => {
    setEditing(false);
    if (draft !== content.text) {
      onChange({ text: draft, display: content.display });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setDraft(content.text);
      setEditing(false);
    }
  };

  return (
    <div className="group relative">
      <div className="flex items-center gap-2">
        <Sigma className="h-4 w-4 shrink-0 text-purple-400" />
        {editing ? (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="E = mc²"
            autoFocus
            className="flex-1 bg-transparent font-mono text-sm text-purple-300 outline-none placeholder:text-zinc-600"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={cn(
              "flex-1 rounded px-2 py-1 text-left font-mono text-sm transition-colors",
              content.text ? "text-purple-300 hover:bg-zinc-800/50" : "text-zinc-600 hover:bg-zinc-800/50"
            )}
          >
            {content.text || "Click to add equation..."}
          </button>
        )}
      </div>
    </div>
  );
}
