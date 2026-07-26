"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Copy, RotateCcw, Archive } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { DuplicateModal } from "@/components/modals/DuplicateModal";
import type { Entity } from "@/lib/types";

interface EntityHeaderProps {
  token: string;
  workspaceId: string;
  entityId: string;
  entity: Entity | null;
  onEntityChange: (entity: Entity) => void;
  onCreateEntity?: (name: string) => Promise<void>;
}

export default function EntityHeader({ workspaceId, entityId, entity, onEntityChange, onCreateEntity }: EntityHeaderProps) {
  const router = useRouter();
  const [showDuplicate, setShowDuplicate] = useState(false);

  const handleDuplicate = () => {
    setShowDuplicate(true);
  };

  const handleDuplicateConfirm = async (newName: string) => {
      const json = await apiClient.post<{ data: { id: string } }>(`/workspaces/${workspaceId}/entities/${entityId}/duplicate`, { name: newName });
    router.push(`/workspace/${workspaceId}/entity/${json.data.id}`);
  };

  const handleRestore = async () => {
    if (!confirm("Restore this entity?")) return;
    try {
      const json = await apiClient.post<{ data: Entity }>(`/workspaces/${workspaceId}/entities/${entityId}/restore`);
      onEntityChange(json.data);
    } catch { /* ignore */ }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this entity?")) return;
    try {
      const json = await apiClient.post<{ data: Entity }>(`/workspaces/${workspaceId}/entities/${entityId}/archive`);
      onEntityChange(json.data);
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href={`/workspace/${workspaceId}/dashboard`} className="hover:text-foreground">
          <span className="flex items-center gap-1">← Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-foreground">{entity?.name || "Untitled"}</span>
      </div>

      <div>
        <input
          type="text"
          value={entity?.name || ""}
          onChange={async (e) => {
            const newName = e.target.value;
            onEntityChange({ ...entity!, name: newName });
            if (entityId === "new") {
              await onCreateEntity?.(newName);
            } else {
              await apiClient.patch(`/workspaces/${workspaceId}/entities/${entityId}`, { name: newName });
            }
          }}
          className="w-full bg-transparent text-3xl font-bold text-foreground outline-none placeholder:text-muted display-heading"
          placeholder="Untitled"
        />
        {entity?.created_at && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <Clock className="h-3 w-3" />
            Created {new Date(entity.created_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDuplicate}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </button>
        {entity?.is_deleted && (
          <button
            onClick={handleRestore}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restore
          </button>
        )}
        <button
          onClick={handleArchive}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
      </div>

      <DuplicateModal
        open={showDuplicate}
        onClose={() => setShowDuplicate(false)}
        onConfirm={handleDuplicateConfirm}
        originalTitle={entity?.name || "Untitled"}
      />
    </>
  );
}
