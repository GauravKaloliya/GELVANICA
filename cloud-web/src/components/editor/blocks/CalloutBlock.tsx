"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, AlertCircle, Lightbulb, Flame } from "lucide-react";

const CALLOUT_VARIANTS = {
  info: { icon: Info, bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
  warning: { icon: AlertTriangle, bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
  error: { icon: AlertCircle, bg: "bg-red-500/10 border-red-500/20", text: "text-red-400" },
  tip: { icon: Lightbulb, bg: "bg-green-500/10 border-green-500/20", text: "text-green-400" },
  fire: { icon: Flame, bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-400" },
} as const;

type CalloutVariant = keyof typeof CALLOUT_VARIANTS;

interface CalloutBlockProps {
  content: { text: string; icon?: string };
  onChange: (content: { text: string; icon: string }) => void;
  readOnly?: boolean;
}

export default function CalloutBlock({ content, onChange, readOnly }: CalloutBlockProps) {
  const variant = (content.icon as CalloutVariant) || "info";
  const config = CALLOUT_VARIANTS[variant] || CALLOUT_VARIANTS.info;
  const Icon = config.icon;
  const [selecting, setSelecting] = useState(false);

  return (
    <div className={cn("rounded-lg border p-4", config.bg)}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <button
            onClick={() => !readOnly && setSelecting(!selecting)}
            disabled={readOnly}
            className={cn("shrink-0 transition-colors", config.text)}
          >
            <Icon className="h-5 w-5" />
          </button>
          {selecting && (
            <div className="absolute left-0 top-6 z-10 w-32 rounded-lg border border-border bg-card p-1 neo-depth-zinc">
              {(Object.keys(CALLOUT_VARIANTS) as CalloutVariant[]).map((v) => {
                const VIcon = CALLOUT_VARIANTS[v].icon;
                return (
                  <button
                    key={v}
                    onClick={() => {
                      onChange({ text: content.text, icon: v });
                      setSelecting(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-surface"
                  >
                    <VIcon className={cn("h-3.5 w-3.5", CALLOUT_VARIANTS[v].text)} />
                    <span className="capitalize">{v}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <textarea
          value={content.text || ""}
          onChange={(e) => onChange({ text: e.target.value, icon: content.icon || "info" })}
          readOnly={readOnly}
          placeholder="Callout text..."
          className="flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          rows={Math.max(1, Math.ceil((content.text || "").length / 60))}
        />
      </div>
    </div>
  );
}
