"use client";

import { Tag, Link2, MessageSquare, FolderOpen, Activity, History, Bot, ArrowLeftRight, Settings } from "lucide-react";

export type Panel = "tags" | "relations" | "comments" | "ai" | "backlinks" | "children" | "activity" | "properties" | "history" | null;

interface PanelTabsProps {
  activePanel: Panel;
  onTogglePanel: (panel: Panel) => void;
}

export default function PanelTabs({ activePanel, onTogglePanel }: PanelTabsProps) {
  const tabs: Array<{ panel: Panel; icon: React.ReactNode; label: string }> = [
    { panel: "tags", icon: <Tag className="h-3.5 w-3.5" />, label: "Tags" },
    { panel: "relations", icon: <Link2 className="h-3.5 w-3.5" />, label: "Relations" },
    { panel: "comments", icon: <MessageSquare className="h-3.5 w-3.5" />, label: "Comments" },
    { panel: "children", icon: <FolderOpen className="h-3.5 w-3.5" />, label: "Children" },
    { panel: "activity", icon: <Activity className="h-3.5 w-3.5" />, label: "Events" },
    { panel: "ai", icon: <Bot className="h-3.5 w-3.5" />, label: "AI" },
    { panel: "backlinks", icon: <ArrowLeftRight className="h-3.5 w-3.5" />, label: "Backlinks" },
    { panel: "properties", icon: <Settings className="h-3.5 w-3.5" />, label: "Properties" },
    { panel: "history", icon: <History className="h-3.5 w-3.5" />, label: "History" },
  ];

  return (
    <div className="flex gap-4 border-b border-border pb-3 text-sm">
      {tabs.map((tab) => (
        <button
          key={tab.panel}
          onClick={() => onTogglePanel(tab.panel)}
          className={`flex items-center gap-1.5 ${activePanel === tab.panel ? "text-foreground" : "text-muted hover:text-foreground"}`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}
