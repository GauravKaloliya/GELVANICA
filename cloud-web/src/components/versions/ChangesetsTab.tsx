"use client";

import { GitCommitHorizontal } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Changeset } from "@/lib/types";

interface ChangesetsTabProps {
  branchId: string | null;
  changesets: Changeset[];
}

export default function ChangesetsTab({ branchId, changesets }: ChangesetsTabProps) {
  if (!branchId) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted">No default branch found for this workspace.</p>
      </div>
    );
  }

  if (changesets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <GitCommitHorizontal className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 text-sm text-muted">No changesets yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {changesets.map((cs) => (
        <div
          key={cs.id}
          className="flex items-center justify-between rounded-lg border-border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <GitCommitHorizontal className="h-4 w-4 text-muted" />
            <div>
              <p className="text-sm font-medium text-white">
                {cs.message || `Changeset ${cs.id.slice(0, 8)}`}
              </p>
              <p className="text-xs text-muted">
                {formatRelativeTime(cs.created_at)}
                {cs.snapshot_id && (
                  <span className="ml-2 text-muted">
                    snapshot {cs.snapshot_id.slice(0, 8)}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
