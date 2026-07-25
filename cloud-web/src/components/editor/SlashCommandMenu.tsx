"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Code, Quote, AlertTriangle, Image, Minus, Table, ChevronRight,
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
  { label: "Heading 1", description: "Large section heading", icon: Heading1, blockType: "heading_1", keywords: ["h1", "heading", "title"] },
  { label: "Heading 2", description: "Medium section heading", icon: Heading2, blockType: "heading_2", keywords: ["h2", "heading"] },
  { label: "Heading 3", description: "Small section heading", icon: Heading3, blockType: "heading_3", keywords: ["h3", "heading"] },
  { label: "Bulleted List", description: "Simple bulleted list", icon: List, blockType: "bulleted_list", keywords: ["bullet", "list", "ul"] },
  { label: "Numbered List", description: "Numbered list", icon: ListOrdered, blockType: "numbered_list", keywords: ["number", "list", "ol"] },
  { label: "To-do", description: "Track tasks with a to-do list", icon: CheckSquare, blockType: "to_do", keywords: ["todo", "task", "checkbox"] },
  { label: "Code", description: "Code block with syntax highlighting", icon: Code, blockType: "code", keywords: ["code", "pre", "snippet"] },
  { label: "Quote", description: "Capture a quote", icon: Quote, blockType: "quote", keywords: ["quote", "blockquote"] },
  { label: "Callout", description: "Make content stand out", icon: AlertTriangle, blockType: "callout", keywords: ["callout", "alert", "info", "warning"] },
  { label: "Image", description: "Upload or embed an image", icon: Image, blockType: "image", keywords: ["image", "photo", "picture"] },
  { label: "Divider", description: "Visual separator", icon: Minus, blockType: "divider", keywords: ["divider", "hr", "separator", "line"] },
  { label: "Table", description: "Table with rows and columns", icon: Table, blockType: "table", keywords: ["table", "spreadsheet", "grid"] },
  { label: "Toggle", description: "Toggles to hide or show content", icon: ChevronRight, blockType: "toggle", keywords: ["toggle", "collapse", "expand", "accordion"] },
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
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
        <p className="text-xs text-zinc-500">No commands found</p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      onKeyDown={handleKeyDown}
      className="w-72 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
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
              idx === selectedIndex ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/50"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{cmd.label}</p>
              <p className="text-[11px] text-zinc-500">{cmd.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
