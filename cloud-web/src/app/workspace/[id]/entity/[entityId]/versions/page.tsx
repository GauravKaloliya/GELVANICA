"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { useVersion } from "@/hooks/useVersion";
import type { EntityVersion, Changeset, Snapshot, DiffEntry, Branch } from "@/lib/types";
import {
  ArrowLeft, Clock, ArrowLeftRight, GitCommitHorizontal, GitMerge, Layers,
  Columns2, Rows3, AlertTriangle, Check, Loader2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Skeleton } from "@/components/ui/Skeleton";
import ChangesetsTab from "@/components/versions/ChangesetsTab";
import SnapshotsTab from "@/components/versions/SnapshotsTab";
import { MergeModal } from "@/components/modals/MergeModal";

const CompareTab = React.lazy(() => import("@/components/versions/CompareTab"));
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import VersionTimeline from "@/components/versions/VersionTimeline";
import BranchSelector from "@/components/versions/BranchSelector";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MergeConflict {
  entity_id: string;
  conflict_type: string;
  details: string;
}

export default function VersionsPage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;
  const entityId = params.entityId as string;

  const [versions, setVersions] = useState<EntityVersion[]>([]);
  const [changesets, setChangesets] = useState<Changeset[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [loadingChangesets, setLoadingChangesets] = useState(true);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [, setRestoring] = useState<string | null>(null);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [leftVersionId, setLeftVersionId] = useState("");
  const [rightVersionId, setRightVersionId] = useState("");
  const [versionDiff, setVersionDiff] = useState<DiffEntry | null>(null);
  const [comparing, setComparing] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [activeTab, setActiveTab] = useState("versions");
  const [showMerge, setShowMerge] = useState(false);
  const [mergeSource] = useState("main");
  const [mergeTarget] = useState("feature");
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflict[]>([]);
  const [viewMode, setViewMode] = useState<"unified" | "side-by-side">("unified");

  const { listEntityVersions, listChangesets, listSnapshots, createSnapshot: createSnapshotApi, restoreVersion, compareDiff } = useVersion(entityId);

  const fetchVersions = useCallback(async () => {
    if (!entityId) return;
    setLoadingVersions(true);
    try {
      const data = await listEntityVersions();
      setVersions(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingVersions(false);
    }
  }, [entityId, listEntityVersions]);

  const fetchChangesets = useCallback(async () => {
    setLoadingChangesets(true);
    try {
      const data = await listChangesets();
      setChangesets(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingChangesets(false);
    }
  }, [listChangesets]);

  const fetchSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const data = await listSnapshots();
      setSnapshots(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingSnapshots(false);
    }
  }, [listSnapshots]);

  useEffect(() => {
    if (!tokens?.access_token || !workspaceId) return;
    (async () => {
      try {
        const json = await apiClient.get<{ data: Branch[] }>(`/branches/?workspace_id=${workspaceId}`);
        const branchList = json.data || [];
        setBranches(branchList);
        const defaultBranch = branchList.find(
          (b: { is_default: boolean }) => b.is_default,
        );
        if (defaultBranch) setBranchId(defaultBranch.id);
      } catch {
        // ignore
      }
    })();
  }, [tokens, workspaceId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  useEffect(() => {
    if (branchId) {
      fetchChangesets();
      fetchSnapshots();
    }
  }, [branchId, fetchChangesets, fetchSnapshots]);

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId);
    try {
      await restoreVersion(versionId);
      await fetchVersions();
    } finally {
      setRestoring(null);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;
    setCreatingSnapshot(true);
    try {
      await createSnapshotApi({
        entity_id: entityId,
        label: snapshotName.trim() || undefined,
      });
      setSnapshotName("");
      fetchSnapshots();
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleCompare = async () => {
    if (!leftVersionId || !rightVersionId) return;
    setComparing(true);
    setHasCompared(false);
    try {
      const data = await compareDiff({
        entity_id: entityId,
        left_version_id: leftVersionId,
        right_version_id: rightVersionId,
      });
      setVersionDiff(data || null);
      setHasCompared(true);
    } catch {
      setVersionDiff(null);
      setHasCompared(true);
    } finally {
      setComparing(false);
    }
  };

  const handleResolveConflict = (entityId: string, resolution: "mine" | "theirs" | "manual") => {
    setMergeConflicts((prev) => prev.filter((c) => c.entity_id !== entityId));
    toast.success(`Conflict resolved: ${resolution === "mine" ? "Kept Mine" : resolution === "theirs" ? "Kept Theirs" : "Manual edit started"}`);
  };

  const handleResolveAll = () => {
    setMergeConflicts([]);
    toast.success("All conflicts resolved (Kept Mine)");
  };

  const versionLabel = (v: EntityVersion) =>
    `Version ${v.id.slice(0, 8)}${v.changeset_id ? ` (cs ${v.changeset_id.slice(0, 8)})` : ""}`;

  const diffFields = versionDiff
    ? Object.entries(versionDiff.diff).map(([field, { left, right }]) => {
        const isAdded = left === undefined || left === null;
        const isRemoved = right === undefined || right === null;
        return {
          field,
          type: (isAdded ? "added" : isRemoved ? "removed" : "modified") as "added" | "removed" | "modified",
          before: left,
          after: right,
        };
      })
    : [];

  const isLoading = loadingVersions || loadingChangesets || loadingSnapshots;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href={`/workspace/${workspaceId}/entity/${entityId}`} className="hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href={`/workspace/${workspaceId}/entity/${entityId}`} className="hover:text-white">Entity</Link>
        <span>/</span>
        <span className="text-zinc-300">Version History</span>
      </div>
      <h1 className="text-2xl font-bold text-white">Version History</h1>
      <BranchSelector
        branches={branches}
        currentBranchId={branchId ?? undefined}
        onSelectBranch={setBranchId}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="versions" className="flex-1 gap-2">
            <Clock className="h-4 w-4" />
            Versions
            <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {versions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="changesets" className="flex-1 gap-2">
            <GitCommitHorizontal className="h-4 w-4" />
            Changesets
            <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {changesets.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="snapshots" className="flex-1 gap-2">
            <Layers className="h-4 w-4" />
            Snapshots
            <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {snapshots.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex-1 gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Compare
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-zinc-700">
            <button
              onClick={() => setViewMode("unified")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm",
                viewMode === "unified" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-300",
              )}
            >
              <Rows3 className="h-3.5 w-3.5" />
              Unified
            </button>
            <button
              onClick={() => setViewMode("side-by-side")}
              className={cn(
                "flex items-center gap-1.5 border-l border-zinc-700 px-3 py-1.5 text-sm",
                viewMode === "side-by-side" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-300",
              )}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Side-by-side
            </button>
          </div>
          <button
            onClick={() => setShowMerge(true)}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <GitMerge className="h-4 w-4" />
            Merge
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <Skeleton variant="circular" width={28} height={28} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="versions">
              <VersionTimeline versions={versions} onRestore={handleRestore} />
            </TabsContent>
            <TabsContent value="changesets">
              <ChangesetsTab branchId={branchId} changesets={changesets} />
            </TabsContent>
            <TabsContent value="snapshots">
              <SnapshotsTab
                branchId={branchId}
                snapshots={snapshots}
                creatingSnapshot={creatingSnapshot}
                snapshotName={snapshotName}
                onSnapshotNameChange={setSnapshotName}
                onCreateSnapshot={handleCreateSnapshot}
              />
            </TabsContent>
            <TabsContent value="compare">
              <Suspense fallback={<div className="flex items-center justify-center h-[400px]"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>}>
                <CompareTab
                  versions={versions}
                  leftVersionId={leftVersionId}
                  rightVersionId={rightVersionId}
                  onLeftChange={setLeftVersionId}
                  onRightChange={setRightVersionId}
                  onCompare={handleCompare}
                  comparing={comparing}
                  hasCompared={hasCompared}
                  diffFields={diffFields}
                  versionLabel={versionLabel}
                  viewMode={viewMode}
                />
              </Suspense>
            </TabsContent>
          </>
        )}
      </Tabs>

      {mergeConflicts.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{mergeConflicts.length} merge conflict{mergeConflicts.length !== 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={handleResolveAll}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30"
            >
              <Check className="h-3.5 w-3.5" />
              Resolve All (Keep Mine)
            </button>
          </div>
          <div className="space-y-2">
            {mergeConflicts.map((conflict) => (
              <div
                key={conflict.entity_id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm text-zinc-300">
                    <span className="font-medium">{conflict.entity_id.slice(0, 8)}</span>
                    <span className="mx-1.5 text-zinc-600">·</span>
                    <span className="text-zinc-500 text-xs">{conflict.conflict_type}</span>
                  </p>
                  <p className="text-xs text-zinc-500">{conflict.details}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleResolveConflict(conflict.entity_id, "mine")} className="rounded-md bg-green-500/10 px-2.5 py-1 text-xs text-green-400 hover:bg-green-500/20">Keep Mine</button>
                  <button onClick={() => handleResolveConflict(conflict.entity_id, "theirs")} className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-500/20">Keep Theirs</button>
                  <button onClick={() => handleResolveConflict(conflict.entity_id, "manual")} className="rounded-md bg-zinc-700/50 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-700">Manual</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MergeModal
        open={showMerge}
        onClose={() => setShowMerge(false)}
        onConfirm={async () => {
          if (!tokens?.access_token) return;
          try {
          const res = await apiClient.post<{ data?: { conflicts?: MergeConflict[] } }>("/branches/merge", {
            source_branch_id: mergeSource,
            target_branch_id: mergeTarget,
          });
          if (res.data?.conflicts?.length) {
              setMergeConflicts(res.data.conflicts);
              toast.warning(`Merge completed with ${res.data.conflicts.length} conflict(s)`);
            } else {
              toast.success("Branches merged successfully");
            }
            fetchVersions();
            if (branchId) {
              fetchChangesets();
              fetchSnapshots();
            }
          } catch {
            toast.error("Merge failed. Please try again.");
          }
        }}
        sourceBranch={mergeSource}
        targetBranch={mergeTarget}
      />
    </div>
  );
}
