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
          <p className="mt-1 text-center text-[11px] text-zinc-500">{content.alt}</p>
        )}
        {!readOnly && (
          <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
            <button
              onClick={() => {
                setUrlInput(content.url || "");
                setAltInput(content.alt || "");
                setEditing(true);
              }}
              className="rounded-md bg-zinc-900/80 p-1.5 text-zinc-400 backdrop-blur hover:text-white"
            >
              <Link className="h-3 w-3" />
            </button>
            <button
              onClick={() => onChange({ url: "", alt: "" })}
              className="rounded-md bg-zinc-900/80 p-1.5 text-zinc-400 backdrop-blur hover:text-red-400"
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
        dragOver ? "border-blue-500 bg-blue-500/5" : "border-zinc-700 hover:border-zinc-600"
      )}
    >
      {loading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-500" />
      ) : (
        <>
          <ImageIcon className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-2 text-xs text-zinc-500">
            Paste an image URL or drag &amp; drop
          </p>

          <div className="mt-4 space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="https://example.com/image.png"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <input
              type="text"
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Alt text (optional)"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!urlInput.trim()}
                className="flex-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-200 disabled:opacity-30"
              >
                Set Image
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300">
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
