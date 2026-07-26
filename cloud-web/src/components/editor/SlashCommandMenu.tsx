"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Code, Quote, AlertTriangle, Image, Minus, ChevronRight,
  Video, FileText, Bookmark, ListTree, Columns, Columns3, ArrowLeftRight,
} from "lucide-react";
import type { BlockType } from "@/lib/types";

interface CommandItem {
  label: string;
  description: string;
  icon: React.ElementType;
  blockType: BlockType;
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  { label: "Text", description: "Plain text block", icon: Type, blockType: "text", keywords: ["text", "paragraph", "plain"] },
  { label: "Heading 1", description: "Large section heading", icon: Heading1, blockType: "heading1", keywords: ["h1", "heading", "title"] },
  { label: "Heading 2", description: "Medium section heading", icon: Heading2, blockType: "heading2", keywords: ["h2", "heading"] },
  { label: "Heading 3", description: "Small section heading", icon: Heading3, blockType: "heading3", keywords: ["h3", "heading"] },
  { label: "Bulleted List", description: "Simple bulleted list", icon: List, blockType: "bulleted_list", keywords: ["bullet", "list", "ul"] },
  { label: "Numbered List", description: "Numbered list", icon: ListOrdered, blockType: "numbered_list", keywords: ["number", "list", "ol"] },
  { label: "To-do", description: "Track tasks with a to-do list", icon: CheckSquare, blockType: "to-do", keywords: ["todo", "task", "checkbox"] },
  { label: "Code", description: "Code block with syntax highlighting", icon: Code, blockType: "code", keywords: ["code", "pre", "snippet"] },
  { label: "Quote", description: "Capture a quote", icon: Quote, blockType: "quote", keywords: ["quote", "blockquote"] },
  { label: "Callout", description: "Make content stand out", icon: AlertTriangle, blockType: "callout", keywords: ["callout", "alert", "info", "warning"] },
  { label: "Image", description: "Upload or embed an image", icon: Image, blockType: "image", keywords: ["image", "photo", "picture"] },
  { label: "Divider", description: "Visual separator", icon: Minus, blockType: "divider", keywords: ["divider", "hr", "separator", "line"] },
  { label: "Toggle", description: "Toggles to hide or show content", icon: ChevronRight, blockType: "toggle", keywords: ["toggle", "collapse", "expand", "accordion"] },
  { label: "Video", description: "Embed a video", icon: Video, blockType: "video", keywords: ["video", "embed", "youtube", "vimeo"] },
  { label: "File", description: "Upload or link a file", icon: FileText, blockType: "file", keywords: ["file", "attachment", "document"] },
  { label: "Bookmark", description: "Link with a preview", icon: Bookmark, blockType: "bookmark", keywords: ["bookmark", "link", "preview"] },
  { label: "Table of Contents", description: "Auto-generated table of contents", icon: ListTree, blockType: "table_of_contents", keywords: ["toc", "table of contents", "outline"] },
  { label: "Column List", description: "Multi-column layout", icon: Columns, blockType: "column_list", keywords: ["column", "layout", "grid", "columns"] },
  { label: "Column", description: "A single column block", icon: Columns3, blockType: "column", keywords: ["column", "col"] },
  { label: "Breadcrumb", description: "Page navigation trail", icon: ArrowLeftRight, blockType: "breadcrumb", keywords: ["breadcrumb", "navigation", "trail"] },
];

interface SlashCommandMenuProps {
  onSelect: (blockType: BlockType) => void;
  onClose: () => void;
  query: string;
}

export default function SlashCommandMenu({ onSelect, onClose, query }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter((cmd) => {
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].blockType);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, selectedIndex, onSelect, onClose]
  );

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 neo-depth-zinc">
        <p className="text-xs text-muted">No commands found</p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      onKeyDown={handleKeyDown}
      className="w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-card p-1 neo-depth-zinc"
      role="listbox"
    >
      {filtered.map((cmd, idx) => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.blockType}
            onClick={() => onSelect(cmd.blockType)}
            onMouseEnter={() => setSelectedIndex(idx)}
            role="option"
            aria-selected={idx === selectedIndex}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
              idx === selectedIndex ? "bg-surface text-foreground" : "text-muted hover:bg-surface"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{cmd.label}</p>
              <p className="text-[11px] text-muted">{cmd.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
