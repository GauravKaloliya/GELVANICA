"use client";

import { cn } from "@/lib/utils";
import type { BlockType } from "@/lib/types";
import {
  Bold, Italic, Strikethrough, Code, Link2, AlignLeft,
  Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, Minus, Image, Undo, Redo,
} from "lucide-react";

interface EditorToolbarProps {
  onBlockTypeChange?: (type: BlockType) => void;
  onFormat?: (format: string) => void;
  activeFormats?: string[];
  disabled?: boolean;
}

interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  separator?: boolean;
}

function ToolbarButton({ icon: Icon, label, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface hover:text-foreground",
        disabled && "opacity-30"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function EditorToolbar({ onFormat, activeFormats = [], disabled }: EditorToolbarProps) {
  const isActive = (format: string) => activeFormats.includes(format);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-2 py-1">
      <ToolbarButton
        icon={Undo}
        label="Undo"
        disabled={disabled}
      />
      <ToolbarButton
        icon={Redo}
        label="Redo"
        disabled={disabled}
      />
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        icon={Heading1}
        label="Heading 1"
        active={isActive("heading_1")}
        disabled={disabled}
        onClick={() => onFormat?.("heading_1")}
      />
      <ToolbarButton
        icon={Heading2}
        label="Heading 2"
        active={isActive("heading_2")}
        disabled={disabled}
        onClick={() => onFormat?.("heading_2")}
      />
      <ToolbarButton
        icon={Heading3}
        label="Heading 3"
        active={isActive("heading_3")}
        disabled={disabled}
        onClick={() => onFormat?.("heading_3")}
      />
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        icon={Bold}
        label="Bold"
        active={isActive("bold")}
        disabled={disabled}
        onClick={() => onFormat?.("bold")}
      />
      <ToolbarButton
        icon={Italic}
        label="Italic"
        active={isActive("italic")}
        disabled={disabled}
        onClick={() => onFormat?.("italic")}
      />
      <ToolbarButton
        icon={Strikethrough}
        label="Strikethrough"
        active={isActive("strikethrough")}
        disabled={disabled}
        onClick={() => onFormat?.("strikethrough")}
      />
      <ToolbarButton
        icon={Code}
        label="Inline code"
        active={isActive("code")}
        disabled={disabled}
        onClick={() => onFormat?.("code")}
      />
      <ToolbarButton
        icon={Link2}
        label="Link"
        active={isActive("link")}
        disabled={disabled}
        onClick={() => onFormat?.("link")}
      />
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        icon={AlignLeft}
        label="Align left"
        active={isActive("align_left")}
        disabled={disabled}
        onClick={() => onFormat?.("align_left")}
      />
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        icon={List}
        label="Bulleted list"
        active={isActive("bulleted_list")}
        disabled={disabled}
        onClick={() => onFormat?.("bulleted_list")}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Numbered list"
        active={isActive("numbered_list")}
        disabled={disabled}
        onClick={() => onFormat?.("numbered_list")}
      />
      <ToolbarButton
        icon={CheckSquare}
        label="To-do"
        active={isActive("to_do")}
        disabled={disabled}
        onClick={() => onFormat?.("to_do")}
      />
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        icon={Quote}
        label="Quote"
        active={isActive("quote")}
        disabled={disabled}
        onClick={() => onFormat?.("quote")}
      />
      <ToolbarButton
        icon={Image}
        label="Image"
        disabled={disabled}
        onClick={() => onFormat?.("image")}
      />
      <ToolbarButton
        icon={Minus}
        label="Divider"
        disabled={disabled}
        onClick={() => onFormat?.("divider")}
      />
    </div>
  );
}
