"use client";

import { useState, useEffect } from "react";
import type { SearchMode } from "@/lib/types";
import { configService } from "@/lib/services/configService";
import { cn } from "@/lib/utils";
import { Hash, FileText, Zap, Brain } from "lucide-react";

const SEARCH_ICONS: Record<string, React.ElementType> = {
  keyword: Hash,
  full_text: FileText,
  hybrid: Zap,
  semantic: Brain,
};

interface SearchModeToggleProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  workspaceId: string;
  className?: string;
}

export default function SearchModeToggle({ mode, onChange, workspaceId, className }: SearchModeToggleProps) {
  const [modes, setModes] = useState<Array<{ id: string; label: string; description: string }>>([]);

  useEffect(() => {
    configService.get(workspaceId).then(c => setModes(c.search_modes ?? [])).catch(() => {});
  }, [workspaceId]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {modes.map(({ id, label, description }) => {
        const Icon = SEARCH_ICONS[id] || Hash;
        return (
          <button
            key={id}
            onClick={() => onChange(id as SearchMode)}
            title={description}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              mode === id
                ? "bg-card text-foreground"
                : "bg-surface text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
