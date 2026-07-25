"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Globe } from "lucide-react";

interface EmbedBlockProps {
  content: { url: string; title?: string };
  onChange: (content: { url: string; title?: string }) => void;
}

export default function EmbedBlock({ content }: EmbedBlockProps) {
  const [url, setUrl] = useState(content.url || "");
  const [title] = useState(content.title || "");

  const isYouTube = url.startsWith("https://www.youtube.com/") || url.startsWith("https://youtu.be/") || url.includes("youtube.com/embed/");
  const isVimeo = url.startsWith("https://vimeo.com/") || url.startsWith("https://player.vimeo.com/");
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url) && (url.startsWith("https://") || url.startsWith("data:"));
  const isEmbeddable = isYouTube || isVimeo;

  const getEmbedUrl = (u: string): string | null => {
    if (isYouTube) {
      const match = u.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    }
    if (isVimeo) {
      const match = u.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    }
    return null;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-zinc-500" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL to embed..."
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
        />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 text-zinc-500 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {url && !isEmbeddable && !isImage && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline break-all">
            {title || url}
          </a>
        </div>
      )}

      {embedUrl && (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <iframe
            src={embedUrl}
            className="h-64 w-full"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {isImage && (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <Image src={url} alt={title || "Embedded image"} width={0} height={0} unoptimized className="max-h-64 w-full object-cover" />
        </div>
      )}

      {title && (
        <p className="text-xs text-zinc-500">{title}</p>
      )}
    </div>
  );
}
