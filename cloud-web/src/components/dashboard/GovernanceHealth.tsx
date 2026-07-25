"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import type { GovernanceHealth as GovernanceHealthType } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { GOVERNANCE_THRESHOLDS } from "@/lib/config/constants";

interface GovernanceHealthWidgetProps {
  workspaceId: string;
}

export default function GovernanceHealth({ workspaceId }: GovernanceHealthWidgetProps) {
  const [health, setHealth] = useState<GovernanceHealthType | null>(null);

  useEffect(() => {
    apiClient.get<{ data: GovernanceHealthType }>(`/governance/health?workspace_id=${workspaceId}`)
      .then((json) => setHealth(json.data || null))
      .catch(() => {});
  }, [workspaceId]);

  const score = health?.health_score ?? 0;
  const color =
    score >= GOVERNANCE_THRESHOLDS.EXCELLENT
      ? "text-green-400"
      : score >= GOVERNANCE_THRESHOLDS.NEEDS_ATTENTION
        ? "text-amber-400"
        : "text-red-400";
  const bgColor =
    score >= GOVERNANCE_THRESHOLDS.EXCELLENT
      ? "bg-green-500/10"
      : score >= GOVERNANCE_THRESHOLDS.NEEDS_ATTENTION
        ? "bg-amber-500/10"
        : "bg-red-500/10";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Governance</h2>
        <Link href={`/workspace/${workspaceId}/governance`} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors">
          Details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {!health ? (
        <div className="py-6 text-center">
          <Shield className="mx-auto h-6 w-6 text-zinc-700" />
          <p className="mt-2 text-xs text-zinc-600">No audit data yet</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", bgColor)}>
            <span className={cn("text-lg font-bold", color)}>{score}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {score >= GOVERNANCE_THRESHOLDS.EXCELLENT
                ? "Excellent"
                : score >= GOVERNANCE_THRESHOLDS.NEEDS_ATTENTION
                  ? "Needs Attention"
                  : "Poor"}
            </p>
            <div className="mt-1 flex gap-3 text-[11px] text-zinc-500">
              <span>{health.duplicate_count} dupes</span>
              <span>{health.orphan_count} orphans</span>
              <span>{health.stale_count} stale</span>
            </div>
            <p className="mt-0.5 text-[10px] text-zinc-600">Last audit {formatRelativeTime(health.created_at)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
