"use client";
import { useState } from "react";
import { Video, X } from "lucide-react";

interface VideoBlockProps {
  content: { url?: string; caption?: string };
  onChange: (content: { url: string; caption?: string }) => void;
  readOnly?: boolean;
}

export default function VideoBlock({ content, onChange, readOnly }: VideoBlockProps) {
  const [editing, setEditing] = useState(!content.url && !readOnly);
  const [urlInput, setUrlInput] = useState(content.url || "");
  const [captionInput, setCaptionInput] = useState(content.caption || "");

  const handleSave = () => {
    if (urlInput.trim()) {
      onChange({ url: urlInput.trim(), caption: captionInput.trim() || undefined });
      setEditing(false);
    }
  };

  const getEmbedUrl = (url: string) => {
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  if (content.url && !editing) {
    const embedUrl = getEmbedUrl(content.url);
    return (
      <div className="group relative rounded-md overflow-hidden bg-surface">
        {embedUrl ? (
          <iframe src={embedUrl} className="w-full aspect-video" allowFullScreen title={content.caption || ""} />
        ) : (
          <video src={content.url} controls className="w-full" />
        )}
        {content.caption && <p className="px-3 py-1.5 text-xs text-muted">{content.caption}</p>}
        {!readOnly && (
          <button onClick={() => onChange({ url: "", caption: "" })}
            className="absolute right-2 top-2 rounded bg-surface/80 p-1 text-muted opacity-0 hover:text-red-400 group-hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
      <Video className="mx-auto h-6 w-6 text-muted" />
      <p className="mt-1 text-xs text-muted">Video URL</p>
      <div className="mt-2 flex gap-2">
        <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent" />
        <input type="text" value={captionInput} onChange={(e) => setCaptionInput(e.target.value)}
          placeholder="Caption" className="w-24 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent" />
        <button onClick={handleSave} disabled={!urlInput.trim()}
          className="rounded bg-card px-2 py-1 text-xs font-medium text-foreground hover:opacity-90 disabled:opacity-30">
          Set
        </button>
      </div>
    </div>
  );
}
