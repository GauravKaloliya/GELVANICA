"use client";
import { X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type PanelId = "properties" | "ai" | "comments" | "backlinks" | "history" | "versions" | "info" | "relations";

const panelViews: Record<PanelId, { title: string; description: string }> = {
  properties: { title: "Properties", description: "Entity metadata" },
  ai: { title: "AI", description: "AI assistance" },
  comments: { title: "Comments", description: "Thread discussion" },
  backlinks: { title: "Backlinks", description: "Incoming references" },
  history: { title: "History", description: "Change history" },
  versions: { title: "Version History", description: "Changes and snapshots" },
  info: { title: "Info", description: "Entity details" },
  relations: { title: "Relations", description: "Connected entities" },
};

export function RightPanel() {
  const { rightPanelOpen, activeRightPanel, closeRightPanel, openRightPanel } = useUIStore();
  const panel = panelViews[activeRightPanel as PanelId] ?? panelViews.info;

  if (!rightPanelOpen) return null;

  return (
    <aside className="w-80 border-l border-border bg-background flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{panel.title}</h3>
          <p className="text-[11px] text-muted">{panel.description}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={closeRightPanel} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4 text-sm text-muted">
        <p className="text-xs text-muted italic">Select an item to view details</p>
      </div>
      <div className="border-t border-border p-2">
        <div className="flex gap-1">
          {(Object.keys(panelViews) as PanelId[]).map((key) => {
            const v = panelViews[key];
            return (
              <button
                key={key}
                onClick={() => openRightPanel(key)}
                className={cn(
                  "rounded px-2 py-1 text-[10px] font-medium transition-colors",
                  activeRightPanel === key
                    ? "bg-surface text-foreground"
                    : "text-muted hover:text-foreground"
                )}
              >
                {v.title}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
