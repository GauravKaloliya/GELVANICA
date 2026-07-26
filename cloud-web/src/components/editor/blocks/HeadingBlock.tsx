"use client";

import { cn } from "@/lib/utils";

interface HeadingBlockProps {
  blockType: "heading1" | "heading2" | "heading3";
  content: { text: string };
  onChange: (content: { text: string }) => void;
  readOnly?: boolean;
}

const styles: Record<string, { className: string; placeholder: string }> = {
  heading1: { className: "text-3xl font-bold", placeholder: "Heading 1" },
  heading2: { className: "text-xl font-semibold", placeholder: "Heading 2" },
  heading3: { className: "text-lg font-medium", placeholder: "Heading 3" },
};

export default function HeadingBlock({ blockType, content, onChange, readOnly }: HeadingBlockProps) {
  const style = styles[blockType];

  return (
    <input
      type="text"
      value={content.text || ""}
      onChange={(e) => onChange({ text: e.target.value })}
      readOnly={readOnly}
      placeholder={style.placeholder}
      className={cn(
        "w-full bg-transparent text-foreground outline-none placeholder:text-muted",
        style.className
      )}
    />
  );
}
