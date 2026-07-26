"use client";

import { Camera, Layers, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Snapshot } from "@/lib/types";

interface SnapshotsTabProps {
  branchId: string | null;
  snapshots: Snapshot[];
  creatingSnapshot: boolean;
  snapshotName: string;
  onSnapshotNameChange: (value: string) => void;
  onCreateSnapshot: (e: React.FormEvent) => void;
}

export default function SnapshotsTab({
  branchId,
  snapshots,
  creatingSnapshot,
  snapshotName,
  onSnapshotNameChange,
  onCreateSnapshot,
}: SnapshotsTabProps) {
  return (
    <>
      {branchId && (
        <form onSubmit={onCreateSnapshot} className="flex gap-3">
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => onSnapshotNameChange(e.target.value)}
            placeholder="Snapshot name (optional)"
            className="flex-1 rounded-lg border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={creatingSnapshot}
            className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface disabled:opacity-50"
          >
            {creatingSnapshot ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            Create Snapshot
          </button>
        </form>
      )}

      {!branchId ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted">No default branch found for this workspace.</p>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-sm text-muted">No snapshots yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex items-center justify-between rounded-lg border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {snap.name || `Snapshot ${snap.id.slice(0, 8)}`}
                  </p>
                  {snap.description && (
                    <p className="text-xs text-muted">{snap.description}</p>
                  )}
                  <p className="text-xs text-muted">
                    {formatRelativeTime(snap.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
