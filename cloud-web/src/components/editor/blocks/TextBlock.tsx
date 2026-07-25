"use client";

import { useRef, useCallback } from "react";

interface TextBlockProps {
  content: { text: string };
  onChange: (content: { text: string }) => void;
  placeholder?: string;
}

export default function TextBlock({ content, onChange, placeholder = "Type something..." }: TextBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ text: e.target.value });
      const el = e.target;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Allow default — new block creation handled by parent
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={content.text}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={1}
      className="w-full resize-none bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600 overflow-hidden"
      style={{ height: "auto" }}
      onInput={(e) => {
        const target = e.currentTarget;
        target.style.height = "auto";
        target.style.height = target.scrollHeight + "px";
      }}
    />
  );
}
