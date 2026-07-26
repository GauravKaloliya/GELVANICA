"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import type { Tag } from "@/lib/types";
import { TagBadge } from "./TagBadge";
import { cn } from "@/lib/utils";
import { Check, Plus, Loader2 } from "lucide-react";

interface TagPickerProps {
  workspaceId: string;
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  className?: string;
}

export function TagPicker({ workspaceId, selectedTagIds, onChange, className }: TagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiClient.get<{ data: Tag[] }>(`/workspaces/${workspaceId}/tags/`)
      .then((json) => setTags(json.data || []))
      .catch((e) => console.error('Failed to fetch tags:', e))
      .finally(() => setLoading(false));
  }, [workspaceId, open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    onChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId]
    );
  }, [selectedTagIds, onChange]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const json = await apiClient.post<{ data: Tag }>(`/workspaces/${workspaceId}/tags/`, {
        workspace_id: workspaceId, name: newTagName.trim(), color: "#6b7280",
      });
      const newTag = json.data;
      setTags((prev) => [...prev, newTag]);
      onChange([...selectedTagIds, newTag.id]);
      setNewTagName("");
    } catch (e) { console.error('Failed to create tag:', e); }
    setCreating(false);
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      {selectedTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} color={tag.color} removable onRemove={() => toggleTag(tag.id)} />
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border-border bg-card px-3 py-2 text-xs text-muted card-hover hover:text-foreground transition-colors"
      >
        <span>Select tags...</span>
        <span className="text-[10px]">{selectedTagIds.length}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border-border bg-card neo-depth-zinc">
          <div className="p-2 border-b border-border">
            <div className="flex gap-1">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                placeholder="Create tag..."
                className="flex-1 rounded border-border bg-surface px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted"
              />
              <button
                onClick={handleCreateTag}
                disabled={creating || !newTagName.trim()}
                className="rounded bg-surface px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-1">
            {loading ? (
              <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin text-muted mx-auto" /></div>
            ) : tags.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">No tags yet</p>
            ) : (
              tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-surface"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color || "#6b7280" }} />
                    <span className="flex-1 text-left text-foreground">{tag.name}</span>
                    {isSelected && <Check className="h-3 w-3 text-green-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
