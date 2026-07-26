"use client";
import { useState } from "react";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbBlockProps {
  content: { pages?: string[] };
  onChange: (content: { pages: string[] }) => void;
  readOnly?: boolean;
}

export default function BreadcrumbBlock({ content, onChange, readOnly }: BreadcrumbBlockProps) {
  const pages = content.pages || [];
  const [editing, setEditing] = useState(pages.length === 0 && !readOnly);
  const [input, setInput] = useState(pages.join(" / "));

  const handleSave = () => {
    const items = input.split("/").map((s) => s.trim()).filter(Boolean);
    onChange({ pages: items });
    setEditing(false);
  };

  if (pages.length > 0 && !editing) {
    return (
      <div className="group relative flex items-center gap-1 text-xs text-muted">
        <Home className="h-3 w-3" />
        {pages.map((page, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted" />
            <span className={i === pages.length - 1 ? "text-foreground font-medium" : "hover:text-foreground"}>
              {page}
            </span>
          </span>
        ))}
        {!readOnly && (
          <button
            onClick={() => {
              setInput(pages.join(" / "));
              setEditing(true);
            }}
            className="ml-2 rounded px-1 py-0.5 text-[10px] text-muted opacity-0 hover:text-muted group-hover:opacity-100"
          >
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="Page 1 / Page 2 / Page 3"
        className="flex-1 rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-foreground"
      />
      <button onClick={handleSave} disabled={!input.trim()}
        className="rounded bg-accent px-2 py-1.5 text-xs font-medium text-foreground hover:bg-surface disabled:opacity-30">
        Set
      </button>
    </div>
  );
}
