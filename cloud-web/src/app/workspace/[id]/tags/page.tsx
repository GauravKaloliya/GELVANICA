"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { tagService } from "@/lib/services/tagService";
import type { Tag as TagType } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { TagBadge } from "@/components/tags/TagBadge";
import CreateTagModal from "@/components/tags/CreateTagModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import {
  Plus,
  Edit3,
  Trash2,
  Tag,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#14b8a6",
];

export default function TagsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tagService.list(workspaceId);
      setTags(res.data);
    } catch {
      toast.error("Failed to load tags");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    document.title = 'Tags | Gnovium'
  }, [])

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleUpdate = async (tagId: string) => {
    if (!editingName.trim()) return;
    try {
      await tagService.update(workspaceId, tagId, {
        name: editingName.trim(),
        color: editingColor,
      });
      setEditingId(null);
      fetchTags();
      toast.success("Tag updated");
    } catch {
      toast.error("Failed to update tag");
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      await tagService.delete(workspaceId, tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setDeleteTarget(null);
      toast.success("Tag deleted");
    } catch {
      toast.error("Failed to delete tag");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground display-heading">Tags</h1>
          <p className="mt-1 text-step-3 text-muted">
            {tags.length} tag{tags.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
        >
          <Plus className="h-4 w-4" />
          Create Tag
        </button>
      </div>

      {/* Tags List */}
      {loading ? (
        <div className="space-y-2 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <Skeleton variant="circular" width={16} height={16} />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : tags.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No tags yet"
          description="Create tags to organize your entities"
        />
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-border"
            >
              {editingId === tag.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                    className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditingColor(c)}
                        className={cn(
                          "h-4 w-4 rounded-full",
                          editingColor === c && "ring-2 ring-white"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleUpdate(tag.id)}
                    className="rounded px-2 py-1 text-xs text-green-400 hover:bg-surface"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded px-2 py-1 text-xs text-muted hover:bg-surface"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <TagBadge name={tag.name} color={tag.color} size="md" />
                  <span className="text-[11px] text-muted">
                    {formatRelativeTime(tag.created_at)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditingName(tag.name);
                        setEditingColor(tag.color || PRESET_COLORS[0]);
                      }}
                      className="rounded p-1 text-muted hover:bg-surface hover:text-foreground"
                      aria-label={`Edit ${tag.name}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(tag.id)}
                      className="rounded p-1 text-muted hover:bg-surface hover:text-red-400"
                      aria-label={`Delete ${tag.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateTagModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchTags}
        workspaceId={workspaceId}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) return handleDelete(deleteTarget); }}
        title="Delete Tag"
        description="This tag will be permanently removed from all entities. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
