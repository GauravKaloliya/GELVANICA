"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { relationService } from "@/lib/services/relationService";
import { configService } from "@/lib/services/configService";
import type { Relation } from "@/lib/types";
import { toast } from "sonner";

interface RelationsPanelProps {
  token: string;
  entityId: string;
  workspaceId: string;
}

export default function RelationsPanel({ token, entityId, workspaceId }: RelationsPanelProps) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [relationTypes, setRelationTypes] = useState<string[]>([]);
  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelType, setNewRelType] = useState("");

  useEffect(() => {
    relationService.listByEntity(workspaceId, entityId).then(res => res.data).then(setRelations).catch(() => {});
    configService.get(workspaceId).then(c => {
      const types = c.relation_types ?? [];
      setRelationTypes(types);
      if (types.length > 0) setNewRelType(types[0]);
    }).catch(() => {});
  }, [token, entityId, workspaceId]);

  const handleCreateRelation = async () => {
    if (!newRelTarget.trim()) return;
    try {
      const rel = await relationService.create(workspaceId, {
        source_id: entityId,
        target_id: newRelTarget.trim(),
        type: newRelType,
      }).then(res => res.data);
      setRelations((prev) => [...prev, rel]);
      setNewRelTarget("");
      toast.success("Relation created");
    } catch {
      toast.error("Failed to create relation");
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await relationService.delete(workspaceId, relationId);
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
          className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <select
            value={newRelType}
            onChange={(e) => setNewRelType(e.target.value)}
            className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none"
          >
            {relationTypes.map((rt) => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
          <button
            onClick={handleCreateRelation}
            disabled={!newRelTarget.trim()}
            className="flex items-center gap-1 rounded-md bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-surface-2 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {relations.map((rel) => (
          <div key={rel.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface">
            <div className="min-w-0">
              <span className="text-xs text-muted">{rel.type}</span>
              <span className="text-xs text-muted ml-1">→ {rel.target_id.slice(0, 8)}</span>
              {rel.generated_by === "ai" && (
                <span className="ml-1.5 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400">AI</span>
              )}
            </div>
            <button onClick={() => handleDeleteRelation(rel.id)} className="text-muted hover:text-red-400" aria-label="Delete relation">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {relations.length === 0 && (
          <p className="text-xs text-muted text-center py-4">No relations yet.</p>
        )}
      </div>
    </div>
  );
}
