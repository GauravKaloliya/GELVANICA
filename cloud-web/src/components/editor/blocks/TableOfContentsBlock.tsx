"use client";
import { ListTree } from "lucide-react";

interface TableOfContentsBlockProps {
  content?: Record<string, unknown>;
  onChange?: (content: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export default function TableOfContentsBlock({ readOnly }: TableOfContentsBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListTree className="h-4 w-4 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Table of Contents</span>
      </div>
      <div className="space-y-2 pl-1">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="w-4 h-px bg-border" />
          <span>Heading 1</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted ml-4">
          <span className="w-3 h-px bg-border" />
          <span>Heading 2</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted ml-8">
          <span className="w-2 h-px bg-border" />
          <span>Heading 3</span>
        </div>
      </div>
      {!readOnly && (
        <p className="mt-3 text-[10px] text-muted">Auto-generated from headings in document</p>
      )}
    </div>
  );
}
