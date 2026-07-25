"use client";

import type { SearchMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Hash, FileText, Zap, Brain } from "lucide-react";

interface SearchModeToggleProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  className?: string;
}

const MODES: Array<{ id: SearchMode; label: string; icon: React.ElementType; description: string }> = [
  { id: "keyword", label: "Keyword", icon: Hash, description: "Exact keyword matching" },
  { id: "full_text", label: "Full Text", icon: FileText, description: "Full-text search with ranking" },
  { id: "hybrid", label: "Hybrid", icon: Zap, description: "Combined keyword + semantic" },
  { id: "semantic", label: "Semantic", icon: Brain, description: "AI-powered semantic search" },
];

export default function SearchModeToggle({ mode, onChange, className }: SearchModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {MODES.map(({ id, label, icon: Icon, description }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={description}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            mode === id
              ? "bg-white text-black"
              : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
        </button>
      ))}
    </div>
  );
}
