"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { relationService } from "@/lib/services/relationService";
import type { Relation } from "@/lib/types";
import { toast } from "sonner";
import { RELATION_TYPES } from "@/lib/config/constants";

interface RelationsPanelProps {
  token: string;
  entityId: string;
  workspaceId: string;
}

export default function RelationsPanel({ token, entityId, workspaceId }: RelationsPanelProps) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelType, setNewRelType] = useState("refers_to");

  useEffect(() => {
    relationService.listByEntity(token, entityId).then(setRelations).catch(() => {});
  }, [token, entityId]);

  const handleCreateRelation = async () => {
    if (!newRelTarget.trim()) return;
    try {
      const rel = await relationService.create(token, {
        workspace_id: workspaceId,
        source_entity_id: entityId,
        target_entity_id: newRelTarget.trim(),
        relation_type: newRelType,
      });
      setRelations((prev) => [...prev, rel]);
      setNewRelTarget("");
      toast.success("Relation created");
    } catch {
      toast.error("Failed to create relation");
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await relationService.delete(token, relationId);
      setRelations((prev) => prev.filter((r) => r.id !== relationId));
      toast.success("Relation deleted");
    } catch {
      toast.error("Failed to delete relation");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          type="text"
          value={newRelTarget}
          onChange={(e) => setNewRelTarget(e.target.value)}
          placeholder="Target entity ID..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-500"
        />
        <div className="flex gap-2">
          <select
            value={newRelType}
            onChange={(e) => setNewRelType(e.target.value)}
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none"
          >
            {RELATION_TYPES.map((rt) => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
          <button
            onClick={handleCreateRelation}
            disabled={!newRelTarget.trim()}
            className="flex items-center gap-1 rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {relations.map((rel) => (
          <div key={rel.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-zinc-800/50">
            <div className="min-w-0">
              <span className="text-xs text-zinc-400">{rel.relation_type}</span>
              <span className="text-xs text-zinc-600 ml-1">→ {rel.target_entity_id.slice(0, 8)}</span>
              {rel.generated_by === "ai" && (
                <span className="ml-1.5 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400">AI</span>
              )}
            </div>
            <button onClick={() => handleDeleteRelation(rel.id)} className="text-zinc-600 hover:text-red-400" aria-label="Delete relation">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {relations.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-4">No relations yet.</p>
        )}
      </div>
    </div>
  );
}
