"use client";
import { useState } from "react";
import { File, Link, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileBlockProps {
  content: { url?: string; name?: string };
  onChange: (content: { url: string; name?: string }) => void;
  readOnly?: boolean;
}

export default function FileBlock({ content, onChange, readOnly }: FileBlockProps) {
  const [editing, setEditing] = useState(!content.url && !readOnly);
  const [urlInput, setUrlInput] = useState(content.url || "");
  const [nameInput, setNameInput] = useState(content.name || "");

  const handleSave = () => {
    if (urlInput.trim()) {
      onChange({ url: urlInput.trim(), name: nameInput.trim() || undefined });
      setEditing(false);
    }
  };

  if (content.url && !editing) {
    return (
      <div className="group relative flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-2">
          <File className="h-5 w-5 text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{content.name || "File"}</p>
          <p className="text-xs text-muted truncate">{content.url}</p>
        </div>
        <a href={content.url} target="_blank" rel="noopener noreferrer"
          className="shrink-0 rounded-md bg-surface-2 px-2.5 py-1 text-xs text-foreground hover:bg-surface hover:text-foreground">
          Open
        </a>
        {!readOnly && (
          <button onClick={() => onChange({ url: "", name: "" })}
            className="shrink-0 rounded p-1 text-muted hover:text-red-400">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border-2 border-dashed p-4 text-center transition-colors",
      "border-border hover:border-border/80"
    )}>
      <File className="mx-auto h-6 w-6 text-muted" />
      <p className="mt-1 text-xs text-muted">File URL</p>
      <div className="mt-3 space-y-2">
        <input
          type="url" value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="https://example.com/file.pdf"
          className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <input
          type="text" value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="File name (optional)"
          className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <button onClick={handleSave} disabled={!urlInput.trim()}
          className="w-full rounded bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:opacity-90 disabled:opacity-30">
          Set File
        </button>
      </div>
    </div>
  );
}
