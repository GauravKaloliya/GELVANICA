"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { GovernanceReport, Entity } from "@/lib/types";
import { ArrowRight } from "lucide-react";

interface ApprovalCardProps {
  report: GovernanceReport;
  workspaceId: string;
}

export default function ApprovalCard({ report, workspaceId }: ApprovalCardProps) {
  type IssueItem =
    | { type: "duplicate"; title: string; detail: string; entityId?: undefined }
    | { type: "orphan"; title: string; detail: string; entityId: string }
    | { type: "stale"; title: string; detail: string; entityId: string };

  const reportData = report.data as { duplicates?: Array<{ name: string; count: number }>; orphans?: Entity[]; stale?: Entity[] } | null;

  const issues: IssueItem[] = [
    ...(reportData?.duplicates ?? []).map((d): IssueItem => ({
      type: "duplicate",
      title: d.name || "Untitled",
      detail: `${d.count} similar entities found`,
    })),
    ...(reportData?.orphans ?? []).map((e): IssueItem => ({
      type: "orphan",
      title: e.name || "Untitled",
      detail: "No incoming or outgoing relations",
      entityId: e.id,
    })),
    ...(reportData?.stale ?? []).map((e): IssueItem => ({
      type: "stale",
      title: e.name || "Untitled",
      detail: `Last updated ${formatRelativeTime(e.updated_at)}`,
      entityId: e.id,
    })),
  ];

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center">
        <p className="text-sm text-green-400">All clear — no governance issues found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.slice(0, 10).map((issue, i) => {
        const card = (
          <div className="flex items-center justify-between rounded-lg border-border bg-card px-4 py-3 card-hover">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  issue.type === "duplicate"
                    ? "bg-amber-500/10 text-amber-400"
                    : issue.type === "orphan"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-blue-500/10 text-blue-400"
                )}
              >
                {issue.type === "duplicate" ? "D" : issue.type === "orphan" ? "O" : "S"}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{issue.title}</p>
                <p className="text-[11px] text-muted">{issue.detail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                  issue.type === "duplicate"
                    ? "bg-amber-500/10 text-amber-400"
                    : issue.type === "orphan"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-blue-500/10 text-blue-400"
                )}
              >
                {issue.type}
              </span>
              {issue.entityId && <ArrowRight className="h-3.5 w-3.5 text-muted" />}
            </div>
          </div>
        );

        return issue.entityId ? (
          <Link
            key={i}
            href={`/workspace/${workspaceId}/entity/${issue.entityId}`}
          >
            {card}
          </Link>
        ) : (
          <div key={i}>{card}</div>
        );
      })}
      {issues.length > 10 && (
        <p className="text-center text-xs text-muted">
          +{issues.length - 10} more issues
        </p>
      )}
    </div>
  );
}
