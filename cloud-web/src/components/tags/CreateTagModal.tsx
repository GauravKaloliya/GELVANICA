"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CreateTagModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  workspaceId: string;
}

const PRESET_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#14b8a6"];

export default function CreateTagModal({ open, onClose, onCreated, workspaceId }: CreateTagModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/tags/`, { workspace_id: workspaceId, name: name.trim(), color });
      setName("");
      setColor(PRESET_COLORS[0]);
      onCreated();
      onClose();
    } catch (e) { console.error('Failed to create tag:', e); }
    setCreating(false);
  }, [name, color, workspaceId, onCreated, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border-border bg-background neo-depth p-6">
        <h2 className="text-lg font-semibold text-foreground">Create Tag</h2>
        <p className="mt-1 text-sm text-muted">Add a new tag to organize your entities</p>

        <form onSubmit={handleCreate} className="mt-6 space-y-4">
          <div>
            <label htmlFor="create-tag-name" className="block text-sm font-medium text-muted mb-1.5">Name</label>
            <input
              id="create-tag-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tag name"
              autoFocus
              className="w-full rounded-lg border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="create-tag-color" className="block text-sm font-medium text-muted mb-1.5">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform hover:scale-110",
                    color === c && "ring-2 ring-white ring-offset-2 ring-offset-background"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border-border py-2 text-sm text-foreground hover:bg-surface">
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-card py-2 text-sm font-semibold text-foreground hover:bg-surface disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
