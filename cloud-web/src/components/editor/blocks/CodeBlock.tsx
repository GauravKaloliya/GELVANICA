"use client";

import { useState } from "react";
import { cn, copyToClipboard } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

const LANGUAGES = [
  "text", "javascript", "typescript", "python", "rust", "go", "java", "c",
  "cpp", "html", "css", "sql", "json", "yaml", "bash", "markdown", "latex",
];

interface CodeBlockProps {
  content: { text: string; language?: string };
  onChange: (content: { text: string; language: string }) => void;
  readOnly?: boolean;
}

export default function CodeBlock({ content, onChange, readOnly }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(content.text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-card-border bg-code overflow-hidden">
      <div className="flex items-center justify-between border-b border-card-border px-3 py-1.5">
        <select
          value={content.language || "text"}
          onChange={(e) => !readOnly && onChange({ text: content.text, language: e.target.value })}
          disabled={readOnly}
          className="bg-transparent text-[11px] text-muted outline-none cursor-pointer"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang} className="bg-code text-foreground">
              {lang}
            </option>
          ))}
        </select>
        <button
          onClick={handleCopy}
          className="text-muted hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <textarea
        value={content.text || ""}
        onChange={(e) => !readOnly && onChange({ text: e.target.value, language: content.language || "text" })}
        readOnly={readOnly}
        placeholder="Code..."
        spellCheck={false}
        className={cn(
          "w-full resize-none bg-transparent p-3 font-mono text-sm text-green-400 outline-none",
          "placeholder:text-text-faint min-h-[80px]"
        )}
        rows={Math.max(3, (content.text || "").split("\n").length)}
      />
    </div>
  );
}
