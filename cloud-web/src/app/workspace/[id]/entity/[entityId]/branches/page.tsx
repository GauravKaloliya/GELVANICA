"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useBranch } from "@/hooks/useBranch";
import { branchService } from "@/lib/services/branchService";
import type { Branch, MergeConflict } from "@/lib/types";
import { ArrowLeft, GitBranch, GitMerge, Plus, Loader2, Trash2, AlertTriangle, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { toast } from "sonner";

export default function BranchesPage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;
  const entityId = params.entityId as string;
  const token = tokens?.access_token;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [merging, setMerging] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Branch | null>(null);
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflict[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { listBranches, createBranch, mergeBranch } = useBranch(entityId);

  const fetchBranches = useCallback(async () => {
    try {
      const data = await listBranches();
      setBranches(data || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [listBranches]);

  useEffect(() => {
    fetchBranches();
  }, [tokens, workspaceId, entityId, fetchBranches, listBranches]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const defaultBranch = branches.find((b) => b.is_default);
      await createBranch({
        name: newName.trim(),
        from_branch_id: defaultBranch?.id || undefined,
      });
      setNewName("");
      fetchBranches();
      toast.success("Branch created");
    } catch {
      toast.error("Failed to create branch");
    } finally {
      setCreating(false);
    }
  };

  const handleMerge = async (branchId: string) => {
    const defaultBranch = branches.find((b) => b.is_default);
    if (!defaultBranch) return;
    setMerging(branchId);
    try {
      const result = await mergeBranch(branchId, { target_branch_id: defaultBranch.id });
      const conflicts = result?.metadata?.conflicts as MergeConflict[] | undefined;
      if (conflicts && conflicts.length > 0) {
        setMergeConflicts(conflicts);
        toast.warning(`Merge completed with ${conflicts.length} conflicts`);
      } else {
        toast.success("Branch merged successfully");
      }
      fetchBranches();
    } catch {
      toast.error("Merge failed");
    } finally {
      setMerging(null);
      setMergeTarget(null);
    }
  };

  const handleDelete = async (branchId: string) => {
    if (!token) return;
    try {
      await branchService.delete(branchId);
      fetchBranches();
      toast.success("Branch deleted");
    } catch {
      toast.error("Failed to delete branch");
    }
    setDeleteTarget(null);
  };

  const handleResolveConflict = async (conflict: MergeConflict, resolution: "ours" | "theirs") => {
    if (!token) return;
    setResolvingId(conflict.id);
    try {
      await branchService.resolveConflict(conflict.id, { resolution });
      setMergeConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
      toast.success(`Conflict resolved: kept ${resolution === "ours" ? "mine" : "theirs"}`);
    } catch {
      toast.error("Failed to resolve conflict");
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAll = async (resolution: "ours" | "theirs") => {
    if (!token) return;
    for (const conflict of mergeConflicts) {
      await handleResolveConflict(conflict, resolution);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href={`/workspace/${workspaceId}/dashboard`} className="hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href={`/workspace/${workspaceId}/dashboard`} className="hover:text-white">
          Workspace
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Branches</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Branches</h1>
      </div>

      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New branch name"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Branch
        </button>
      </form>

      {loading ? (
        <div className="space-y-2 py-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={16} height={16} />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton variant="circular" width={24} height={24} />
              </div>
            </div>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 py-12 text-center">
          <GitBranch className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-2 text-sm text-zinc-500">No branches yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {branch.name}
                    {branch.is_default && (
                      <span className="ml-2 rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                        default
                      </span>
                    )}
                  </p>
                  {branch.description && (
                    <p className="text-xs text-zinc-500">{branch.description}</p>
                  )}
                  <p className="text-xs text-zinc-500">{formatRelativeTime(branch.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!branch.is_default && (
                  <>
                    <button
                      onClick={() => setMergeTarget(branch)}
                      disabled={merging === branch.id}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                      {merging === branch.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <GitMerge className="h-3 w-3" />
                      )}
                      Merge
                    </button>
                    <button
                      onClick={() => setDeleteTarget(branch)}
                      className="rounded-md p-1 text-zinc-600 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merge Conflicts Panel */}
      {mergeConflicts.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-amber-400">
                Merge Conflicts ({mergeConflicts.length})
              </h2>
            </div>
            <button
              onClick={() => handleResolveAll("ours")}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
            >
              <Check className="h-3.5 w-3.5" />
              Resolve All (Keep Mine)
            </button>
          </div>
          <div className="space-y-3">
            {mergeConflicts.map((conflict) => (
              <div key={conflict.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Entity {conflict.entity_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Type: {conflict.conflict_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveConflict(conflict, "ours")}
                      disabled={resolvingId === conflict.id}
                      className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      {resolvingId === conflict.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Keep Mine"}
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conflict, "theirs")}
                      disabled={resolvingId === conflict.id}
                      className="rounded-md bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                    >
                      Keep Theirs
                    </button>
                  </div>
                </div>
                {conflict.details && Object.keys(conflict.details).length > 0 && (
                  <pre className="mt-2 max-h-24 overflow-auto rounded bg-zinc-800 p-2 text-[10px] text-zinc-400">
                    {JSON.stringify(conflict.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) return handleDelete(deleteTarget.id); }}
        title="Delete Branch"
        description={`Branch "${deleteTarget?.name}" will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={!!mergeTarget}
        onClose={() => setMergeTarget(null)}
        onConfirm={() => { if (mergeTarget) return handleMerge(mergeTarget.id); }}
        title="Merge Branch"
        description={`Merge "${mergeTarget?.name}" into the default branch. This will apply all changes from this branch.`}
        confirmLabel="Merge"
        variant="warning"
        loading={!!merging}
      />
    </div>
  );
}
