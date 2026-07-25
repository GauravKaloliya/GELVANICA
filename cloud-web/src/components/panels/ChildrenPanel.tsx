"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { Entity, EntityType } from "@/lib/types";

interface ChildrenPanelProps {
  token: string;
  entityId: string;
  workspaceId: string;
}

export default function ChildrenPanel({ entityId, workspaceId }: ChildrenPanelProps) {
  const [children, setChildren] = useState<Entity[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [childTitle, setChildTitle] = useState("");
  const [childType, setChildType] = useState("");

  useEffect(() => {
    apiClient.get<{ data: Entity[] }>(`/entities/${entityId}/children`)
      .then((json) => {
        setChildren(json.data || []);
      });
    apiClient.get<{ data: EntityType[] }>(`/entity-types/?workspace_id=${workspaceId}`)
      .then((json) => {
        setEntityTypes(json.data || []);
      });
  }, [entityId, workspaceId]);

  const handleCreateChild = async () => {
    if (!childTitle.trim() || !childType) return;
    try {
      const json = await apiClient.post<{ data: Entity }>(`/entities/${entityId}/children`, {
        workspace_id: workspaceId, entity_type_id: childType, title: childTitle.trim(),
      });
      setChildren((prev) => [...prev, json.data]);
      setChildTitle("");
      setChildType("");
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          type="text"
          value={childTitle}
          onChange={(e) => setChildTitle(e.target.value)}
          placeholder="Child title..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-500"
        />
        <div className="flex gap-2">
          <select
            value={childType}
            onChange={(e) => setChildType(e.target.value)}
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none"
          >
            <option value="">Select type...</option>
            {entityTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <button onClick={handleCreateChild} className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700" aria-label="Create child entity">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {children.map((child) => (
          <div key={child.id} className="rounded-md px-2 py-1.5 hover:bg-zinc-800/50">
            <Link
              href={`/workspace/${workspaceId}/entity/${child.id}`}
              className="block text-xs text-zinc-300 hover:text-white"
            >
              {child.title || "Untitled"}
            </Link>
          </div>
        ))}
        {children.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-4">No children yet.</p>
        )}
      </div>
    </div>
  );
}
