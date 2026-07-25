"use client";

import Link from "next/link";
import { AtSign } from "lucide-react";

interface MentionBlockProps {
  content: { text: string; entity_id?: string; entity_title?: string; mention_type?: string };
  onChange: (content: { text: string; entity_id?: string; entity_title?: string; mention_type?: string }) => void;
}

export default function MentionBlock({ content }: MentionBlockProps) {
  const displayText = content.entity_title || content.text || "Unknown";
  const workspaceId = typeof window !== "undefined" ? window.location.pathname.split("/workspace/")[1]?.split("/")[0] : null;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-sm text-blue-400 font-medium">
      <AtSign className="h-3 w-3" />
      {content.entity_id && workspaceId ? (
        <Link
          href={`/workspace/${workspaceId}/entity/${content.entity_id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {displayText}
        </Link>
      ) : (
        <span>{displayText}</span>
      )}
    </span>
  );
}
