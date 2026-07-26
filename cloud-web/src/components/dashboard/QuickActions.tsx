"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, FileText, Bookmark, CheckSquare, File, Loader2, X } from "lucide-react";
import type { EntityType } from "@/lib/types";

interface QuickActionsProps {
  workspaceId: string;
}

const ICON_MAP: Record<string, typeof FileText> = {
  page: FileText,
  note: File,
  task: CheckSquare,
  bookmark: Bookmark,
  document: FileText,
  file: File,
};

export default function QuickActions({ workspaceId }: QuickActionsProps) {
  const router = useRouter();
  const { tokens } = useAuthStore();
  const [creating, setCreating] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [shortcuts, setShortcuts] = useState<Array<{ label: string; icon: typeof FileText; entityType: string }>>([]);
  const [defaultEntityTypeId, setDefaultEntityTypeId] = useState("");

  useEffect(() => {
    if (!tokens?.access_token) return;
    apiClient.get<{ data: EntityType[] }>(`/workspaces/${workspaceId}/entities/types`)
      .then((res) => {
        const types = res.data || [];
        if (types.length > 0) {
          setDefaultEntityTypeId(types[0].id);
          setShortcuts(
            types.slice(0, 4).map((t) => ({
              label: t.name,
              icon: ICON_MAP[t.name.toLowerCase()] || FileText,
              entityType: t.id,
            }))
          );
        }
      })
      .catch(() => {});
  }, [tokens, workspaceId]);

  const handleQuickCreate = async (entityType: string) => {
    if (!tokens?.access_token) return;
    setCreating(entityType);
    try {
      const res = await apiClient.post<{ data: { id: string } }>(`/workspaces/${workspaceId}/entities/`, {
        name: `Untitled ${entityType}`,
        entity_type_id: entityType,
        properties: {},
      });
      router.push(`/workspace/${workspaceId}/entity/${res.data.id}`);
    } catch {
      toast.error("Failed to create entity");
    } finally {
      setCreating(null);
    }
  };

  const handleCustomCreate = async () => {
    if (!tokens?.access_token || !customTitle.trim() || !defaultEntityTypeId) return;
    setCreating("custom");
    try {
      const res = await apiClient.post<{ data: { id: string } }>(`/workspaces/${workspaceId}/entities/`, {
        name: customTitle.trim(),
        entity_type_id: defaultEntityTypeId,
        properties: {},
      });
      router.push(`/workspace/${workspaceId}/entity/${res.data.id}`);
    } catch {
      toast.error("Failed to create entity");
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {shortcuts.map(({ label, icon: Icon, entityType }) => (
          <button
            key={entityType}
            onClick={() => handleQuickCreate(entityType)}
            disabled={!!creating}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border p-3 text-left text-sm transition-colors card-hover",
              "hover:text-foreground text-muted",
              creating === entityType && "opacity-50"
            )}
          >
            {creating === entityType ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {label}
          </button>
        ))}
      </div>

      {showCustom ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomCreate()}
            placeholder="Entity title..."
            autoFocus
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-border"
          />
          <button
            onClick={handleCustomCreate}
            disabled={!customTitle.trim()}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/90 disabled:opacity-30"
          >
            Create
          </button>
          <button
            onClick={() => { setShowCustom(false); setCustomTitle(""); }}
            className="rounded-md border border-border px-2 py-2 text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-xs text-muted hover:border-border hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Custom entity
        </button>
      )}
    </div>
  );
}
