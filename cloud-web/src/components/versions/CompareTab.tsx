"use client";

import React, { Suspense } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { EntityVersion } from "@/lib/types";

const DiffViewer = React.lazy(() => import("@/components/versions/DiffViewer"));

interface CompareTabProps {
  versions: EntityVersion[];
  leftVersionId: string;
  rightVersionId: string;
  onLeftChange: (value: string) => void;
  onRightChange: (value: string) => void;
  onCompare: () => void;
  comparing: boolean;
  hasCompared: boolean;
  diffFields: {
    field: string;
    type: "added" | "removed" | "modified";
    before?: unknown;
    after?: unknown;
  }[];
  versionLabel: (v: EntityVersion) => string;
  viewMode?: "unified" | "side-by-side";
}

export default function CompareTab({
  versions,
  leftVersionId,
  rightVersionId,
  onLeftChange,
  onRightChange,
  onCompare,
  comparing,
  hasCompared,
  diffFields,
  versionLabel,
  viewMode = "unified",
}: CompareTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="compare-left-version" className="text-xs font-medium text-zinc-400">Left version (before)</label>
          <select
            id="compare-left-version"
            value={leftVersionId}
            onChange={(e) => onLeftChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
          >
            <option value="">Select a version</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {versionLabel(v)} — {formatRelativeTime(v.created_at)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-1.5">
          <label htmlFor="compare-right-version" className="text-xs font-medium text-zinc-400">Right version (after)</label>
          <select
            id="compare-right-version"
            value={rightVersionId}
            onChange={(e) => onRightChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
          >
            <option value="">Select a version</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {versionLabel(v)} — {formatRelativeTime(v.created_at)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onCompare}
          disabled={!leftVersionId || !rightVersionId || comparing || leftVersionId === rightVersionId}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {comparing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeftRight className="h-4 w-4" />
          )}
          Compare
        </button>
      </div>

      {leftVersionId === rightVersionId && leftVersionId !== "" && (
        <p className="text-xs text-amber-400">Please select two different versions to compare.</p>
      )}

      {hasCompared && (
        <Suspense fallback={<div className="flex items-center justify-center h-[400px]"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>}>
          <DiffViewer
            leftLabel={
              versions.find((v) => v.id === leftVersionId)
                ? `Version ${leftVersionId.slice(0, 8)}`
                : "Before"
            }
            rightLabel={
              versions.find((v) => v.id === rightVersionId)
                ? `Version ${rightVersionId.slice(0, 8)}`
                : "After"
            }
            fields={diffFields}
            emptyMessage="No differences found between the selected versions."
            viewMode={viewMode}
          />
        </Suspense>
      )}
    </div>
  );
}
