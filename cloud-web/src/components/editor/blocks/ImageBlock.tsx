"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Link, X, Loader2, Upload } from "lucide-react";

interface ImageBlockProps {
  content: { url?: string; alt?: string };
  onChange: (content: { url: string; alt: string }) => void;
  readOnly?: boolean;
}

export default function ImageBlock({ content, onChange, readOnly }: ImageBlockProps) {
  const [editing, setEditing] = useState(!content.url && !readOnly);
  const [urlInput, setUrlInput] = useState(content.url || "");
  const [altInput, setAltInput] = useState(content.alt || "");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleSave = () => {
    if (urlInput.trim()) {
      onChange({ url: urlInput.trim(), alt: altInput.trim() });
      setEditing(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLoading(true);

    // Create a local preview URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUrlInput(dataUrl);
      onChange({ url: dataUrl, alt: altInput || file.name });
      setEditing(false);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  if (content.url && !editing) {
    return (
      <div className="group relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={content.url}
          alt={content.alt || ""}
          className="w-full rounded-md object-cover"
          style={{ maxHeight: 400 }}
        />
        {content.alt && (
          <p className="mt-1 text-center text-[11px] text-muted">{content.alt}</p>
        )}
        {!readOnly && (
          <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
            <button
              onClick={() => {
                setUrlInput(content.url || "");
                setAltInput(content.alt || "");
                setEditing(true);
              }}
              className="rounded-md bg-surface/80 p-1.5 text-muted backdrop-blur hover:text-foreground"
            >
              <Link className="h-3 w-3" />
            </button>
            <button
              onClick={() => onChange({ url: "", alt: "" })}
              className="rounded-md bg-surface/80 p-1.5 text-muted backdrop-blur hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        dragOver ? "border-blue-500 bg-blue-500/5" : "border-border hover:border-border/80"
      )}
    >
      {loading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted" />
      ) : (
        <>
          <ImageIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-xs text-muted">
            Paste an image URL or drag &amp; drop
          </p>

          <div className="mt-4 space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="https://example.com/image.png"
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <input
              type="text"
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Alt text (optional)"
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!urlInput.trim()}
                className="flex-1 rounded-md bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:opacity-90 disabled:opacity-30"
              >
                Set Image
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:border-border/80 hover:text-foreground">
                <Upload className="h-3 w-3" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
