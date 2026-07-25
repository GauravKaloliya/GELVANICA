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
}

export default function EntityHeader({ workspaceId, entityId, entity, onEntityChange }: EntityHeaderProps) {
  const router = useRouter();
  const [showDuplicate, setShowDuplicate] = useState(false);

  const handleDuplicate = () => {
    setShowDuplicate(true);
  };

  const handleDuplicateConfirm = async (newTitle: string) => {
    const json = await apiClient.post<{ data: { id: string } }>(`/entities/${entityId}/duplicate`, { title: newTitle });
    router.push(`/workspace/${workspaceId}/entity/${json.data.id}`);
  };

  const handleRestore = async () => {
    if (!confirm("Restore this entity?")) return;
    try {
      const json = await apiClient.post<{ data: Entity }>(`/entities/${entityId}/restore`);
      onEntityChange(json.data);
    } catch { /* ignore */ }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this entity?")) return;
    try {
      const json = await apiClient.post<{ data: Entity }>(`/entities/${entityId}/archive`);
      onEntityChange(json.data);
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href={`/workspace/${workspaceId}/dashboard`} className="hover:text-white">
          <span className="flex items-center gap-1">← Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-300">{entity?.title || "Untitled"}</span>
      </div>

      <div>
        <input
          type="text"
          value={entity?.title || ""}
          onChange={async (e) => {
            const newTitle = e.target.value;
            onEntityChange({ ...entity!, title: newTitle });
            await apiClient.patch(`/entities/${entityId}`, { title: newTitle });
          }}
          className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder:text-zinc-600"
          placeholder="Untitled"
        />
        {entity?.created_at && (
          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            Created {new Date(entity.created_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDuplicate}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white"
        >
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </button>
        {entity?.is_deleted && (
          <button
            onClick={handleRestore}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restore
          </button>
        )}
        <button
          onClick={handleArchive}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white"
        >
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
      </div>

      <DuplicateModal
        open={showDuplicate}
        onClose={() => setShowDuplicate(false)}
        onConfirm={handleDuplicateConfirm}
        originalTitle={entity?.title || "Untitled"}
      />
    </>
  );
}
