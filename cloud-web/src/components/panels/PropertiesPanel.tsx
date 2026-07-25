"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import type { Entity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface PropertiesPanelProps {
  entityId: string;
}

export default function PropertiesPanel({ entityId }: PropertiesPanelProps) {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [properties, setProperties] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    apiClient.get<{ data: Entity }>(`/entities/${entityId}`)
      .then((json) => {
        if (json.data) {
          setEntity(json.data);
          setProperties(json.data.properties || {});
        }
      })
      .catch((e) => console.error('Failed to fetch entity properties:', e))
      .finally(() => setLoading(false));
  }, [entityId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/entities/${entityId}`, { properties });
    } catch (e) { console.error('Failed to save properties:', e); }
    setSaving(false);
  }, [entityId, properties]);

  const addProperty = () => {
    if (!newKey.trim()) return;
    setProperties((prev) => ({ ...prev, [newKey.trim()]: "" }));
    setNewKey("");
  };

  const removeProperty = (key: string) => {
    setProperties((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <Skeleton width="20%" height={10} />
              <Skeleton width="50%" height={14} />
            </div>
          ))}
        </div>
        <div>
          <Skeleton width="30%" height={12} className="mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton width={80} height={12} />
                <Skeleton className="flex-1" height={28} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Type</p>
          <p className="mt-0.5 text-sm text-white">{entity?.entity_type_id || "page"}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Created</p>
          <p className="mt-0.5 text-sm text-white">{entity?.created_at ? new Date(entity.created_at).toLocaleDateString() : "—"}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Updated</p>
          <p className="mt-0.5 text-sm text-white">{entity?.updated_at ? new Date(entity.updated_at).toLocaleDateString() : "—"}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-zinc-400">Properties</p>
          <span className="text-[10px] text-zinc-600">{Object.keys(properties).length}</span>
        </div>
        <div className="space-y-2">
          {Object.entries(properties).map(([key, value]) => (
            <div key={key} className="group flex items-center gap-2">
              <span className="shrink-0 text-xs text-zinc-500 w-20 truncate">{key}</span>
              <input
                value={typeof value === "string" ? value : JSON.stringify(value)}
                onChange={(e) => setProperties((prev) => ({ ...prev, [key]: e.target.value }))}
                className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-white outline-none focus:border-zinc-600"
              />
              <button onClick={() => removeProperty(key)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400" aria-label={`Remove property ${key}`}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProperty()}
            placeholder="New property..."
            className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />
          <button onClick={addProperty} className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:text-white" aria-label="Add property">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "w-full rounded-lg py-1.5 text-xs font-medium transition-colors",
          saving ? "bg-zinc-800 text-zinc-500" : "bg-white text-black hover:bg-zinc-200"
        )}
      >
        {saving ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : "Save Properties"}
      </button>
    </div>
  );
}
