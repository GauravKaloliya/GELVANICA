"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/apiClient";
import { tagService } from "@/lib/services/tagService";
import type { Tag as TagType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2, Archive, RotateCcw, Tag, X, FolderInput, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "danger";
  onClick: () => void;
}

interface BulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh?: () => void;
  actions?: BulkAction[];
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onRefresh,
  actions: customActions,
  className,
}: BulkActionBarProps) {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;
  const token = tokens?.access_token;

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagIdInput, setTagIdInput] = useState("");
  const [tagLoading, setTagLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);

  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (tagDialogOpen && token) {
      tagService.list(workspaceId).then((res) => setAvailableTags(res.data)).catch(() => {});
    }
  }, [tagDialogOpen, token, workspaceId]);

  const handleBulkAction = useCallback(
    async (endpoint: string, body: Record<string, unknown> = {}) => {
      if (!token) return;
      try {
        await apiClient.post(
          endpoint,
          { entity_ids: selectedIds, workspace_id: workspaceId, ...body },
          token
        );
        toast.success(
          `Applied to ${selectedCount} item${selectedCount !== 1 ? "s" : ""}`
        );
        onRefresh?.();
        onClearSelection();
      } catch (e) {
        toast.error((e as Error).message || "Action failed");
      }
    },
    [token, selectedIds, workspaceId, selectedCount, onRefresh, onClearSelection]
  );

  const handleDelete = useCallback(() => {
    toast("Confirm delete?", {
      description: `This will delete ${selectedCount} item${selectedCount !== 1 ? "s" : ""}.`,
      action: {
        label: "Delete",
        onClick: () => handleBulkAction("/workspaces/" + workspaceId + "/entities/bulk-delete"),
      },
      cancel: { label: "Cancel", onClick: () => {} },
      duration: 10000,
    });
  }, [selectedCount, handleBulkAction]);

  const handleArchive = useCallback(
    () => handleBulkAction("/workspaces/" + workspaceId + "/entities/bulk-archive"),
    [handleBulkAction]
  );

  const handleRestore = useCallback(
    () => handleBulkAction("/workspaces/" + workspaceId + "/entities/bulk-restore"),
    [handleBulkAction]
  );

  const handleTag = useCallback(async () => {
    if (!tagIdInput.trim() || !token) return;
    setTagLoading(true);
    try {
      await apiClient.post(
        "/workspaces/" + workspaceId + "/entities/bulk-tag",
        { entity_ids: selectedIds, tag_id: tagIdInput.trim(), workspace_id: workspaceId },
        token
      );
      toast.success(`Tagged ${selectedCount} item${selectedCount !== 1 ? "s" : ""}`);
      onRefresh?.();
      onClearSelection();
      setTagDialogOpen(false);
      setTagIdInput("");
    } catch (e) {
      toast.error((e as Error).message || "Tag failed");
    } finally {
      setTagLoading(false);
    }
  }, [tagIdInput, token, selectedIds, workspaceId, selectedCount, onRefresh, onClearSelection]);

  const handleMove = useCallback(async () => {
    if (!targetWorkspaceId.trim() || !token) return;
    setMoveLoading(true);
    try {
      await apiClient.post(
        "/workspaces/" + workspaceId + "/entities/bulk-move",
        { entity_ids: selectedIds, target_workspace_id: targetWorkspaceId.trim(), workspace_id: workspaceId },
        token
      );
      toast.success(`Moved ${selectedCount} item${selectedCount !== 1 ? "s" : ""}`);
      onRefresh?.();
      onClearSelection();
      setMoveDialogOpen(false);
      setTargetWorkspaceId("");
    } catch (e) {
      toast.error((e as Error).message || "Move failed");
    } finally {
      setMoveLoading(false);
    }
  }, [targetWorkspaceId, token, selectedIds, workspaceId, selectedCount, onRefresh, onClearSelection]);

  const handleBulkAI = useCallback(async () => {
    if (!aiPrompt.trim() || !token) return;
    setAiLoading(true);
    try {
      await apiClient.post(
        "/workspaces/" + workspaceId + "/ai/bulk",
        { entity_ids: selectedIds, workspace_id: workspaceId, prompt: aiPrompt.trim() },
        token
      );
      toast.success(`AI action applied to ${selectedCount} item${selectedCount !== 1 ? "s" : ""}`);
      onRefresh?.();
      onClearSelection();
      setAiDialogOpen(false);
      setAiPrompt("");
    } catch (e) {
      toast.error((e as Error).message || "AI action failed");
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, token, selectedIds, workspaceId, selectedCount, onRefresh, onClearSelection]);

  if (selectedCount === 0) return null;

  const defaultActions: BulkAction[] = [
    { id: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" />, variant: "danger", onClick: handleDelete },
    { id: "archive", label: "Archive", icon: <Archive className="h-4 w-4" />, onClick: handleArchive },
    { id: "restore", label: "Restore", icon: <RotateCcw className="h-4 w-4" />, onClick: handleRestore },
    { id: "tag", label: "Tag", icon: <Tag className="h-4 w-4" />, onClick: () => setTagDialogOpen(true) },
    { id: "move", label: "Move", icon: <FolderInput className="h-4 w-4" />, onClick: () => setMoveDialogOpen(true) },
    { id: "ai", label: "AI Action", icon: <Sparkles className="h-4 w-4" />, onClick: () => setAiDialogOpen(true) },
  ];

  const activeActions = customActions || defaultActions;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
          "flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-sm",
          className
        )}
      >
        <span className="text-sm font-medium text-foreground">
          {selectedCount} selected
        </span>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1">
          {activeActions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                action.variant === "danger"
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        <button
          onClick={onClearSelection}
          className="flex items-center gap-1 rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
          title="Clear selection"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Tag</DialogTitle>
            <DialogDescription>
              Select a tag to apply to {selectedCount} selected item{selectedCount !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          {availableTags.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setTagIdInput(tag.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    tagIdInput === tag.id
                      ? "bg-card/10 text-foreground"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color || "#6b7280" }}
                  />
                  <span className="truncate">{tag.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={tagIdInput}
              onChange={(e) => setTagIdInput(e.target.value)}
              placeholder="Tag ID"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              onKeyDown={(e) => { if (e.key === "Enter") handleTag(); }}
              autoFocus
            />
          )}
          <DialogFooter>
            <button
              onClick={() => setTagDialogOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleTag}
              disabled={!tagIdInput.trim() || tagLoading}
              className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
            >
              {tagLoading ? "Applying..." : "Apply Tag"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Workspace</DialogTitle>
            <DialogDescription>
              Enter the target workspace ID to move {selectedCount} selected item{selectedCount !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={targetWorkspaceId}
            onChange={(e) => setTargetWorkspaceId(e.target.value)}
            placeholder="Target workspace ID"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") handleMove(); }}
            autoFocus
          />
          <DialogFooter>
            <button
              onClick={() => setMoveDialogOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={!targetWorkspaceId.trim() || moveLoading}
              className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
            >
              {moveLoading ? "Moving..." : "Move"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Bulk Action Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Action</DialogTitle>
            <DialogDescription>
              Run an AI action on {selectedCount} selected item{selectedCount !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Summarize all entities, Add tags to all, Generate relations..."
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none"
            autoFocus
          />
          <DialogFooter>
            <button
              onClick={() => setAiDialogOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkAI}
              disabled={!aiPrompt.trim() || aiLoading}
              className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
            >
              {aiLoading ? "Running..." : "Run AI Action"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
