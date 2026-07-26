"use client";
import { useState } from "react";
import { Bookmark, X } from "lucide-react";

interface BookmarkBlockProps {
  content: { url?: string; title?: string; description?: string; icon?: string };
  onChange: (content: { url: string; title?: string; description?: string; icon?: string }) => void;
  readOnly?: boolean;
}

export default function BookmarkBlock({ content, onChange, readOnly }: BookmarkBlockProps) {
  const [editing, setEditing] = useState(!content.url && !readOnly);
  const [urlInput, setUrlInput] = useState(content.url || "");

  const handleSave = () => {
    if (urlInput.trim()) {
      onChange({ url: urlInput.trim(), title: content.title, description: content.description, icon: content.icon });
      setEditing(false);
    }
  };

  if (content.url && !editing) {
    return (
      <div className="group relative rounded-lg border border-border bg-surface/30 overflow-hidden">
        <a href={content.url} target="_blank" rel="noopener noreferrer" className="block p-3 hover:bg-surface/50">
          <div className="flex items-start gap-3">
            {content.icon && (
              <img src={content.icon} alt="" className="mt-0.5 h-5 w-5 rounded" />
            )}
            <div className="flex-1 min-w-0">
              {content.title && (
                <p className="text-sm font-medium text-foreground truncate">{content.title}</p>
              )}
              {content.description && (
                <p className="mt-0.5 text-xs text-muted line-clamp-2">{content.description}</p>
              )}
              <p className="mt-1 text-[11px] text-muted truncate">{content.url}</p>
            </div>
          </div>
        </a>
        {!readOnly && (
          <button onClick={() => onChange({ url: "" })}
            className="absolute right-2 top-2 rounded bg-card/80 p-1 text-muted opacity-0 hover:text-red-400 group-hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
      <Bookmark className="mx-auto h-6 w-6 text-muted" />
      <p className="mt-1 text-xs text-muted">Bookmark URL</p>
      <div className="mt-3 flex gap-2">
        <input type="url" value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="https://example.com"
          className="flex-1 rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-foreground"
        />
        <button onClick={handleSave} disabled={!urlInput.trim()}
          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface disabled:opacity-30">
          Save
        </button>
      </div>
    </div>
  );
}
