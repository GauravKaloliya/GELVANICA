"use client";

import { Sparkles, Copy, Check } from "lucide-react";
import { useState } from "react";

interface AIBlockProps {
  content: { text: string; prompt?: string; model?: string };
  onChange: (content: { text: string; prompt?: string; model?: string }) => void;
}

export default function AIBlock({ content }: AIBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-[10px] font-medium text-purple-400">
          AI Generated
          {content.model && <span className="ml-1 text-purple-500/60">· {content.model}</span>}
        </span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap">{content.text}</p>
      <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-surface hover:text-foreground"
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
