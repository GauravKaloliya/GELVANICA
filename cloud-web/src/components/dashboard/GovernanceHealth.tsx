"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import type { GovernanceHealthScore } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { configService } from "@/lib/services/configService";

interface GovernanceHealthWidgetProps {
  workspaceId: string;
}

export default function GovernanceHealth({ workspaceId }: GovernanceHealthWidgetProps) {
  const [health, setHealth] = useState<GovernanceHealthScore | null>(null);
  const [thresholds, setThresholds] = useState({ excellent: 90, needs_attention: 70 });

  useEffect(() => {
    configService.get(workspaceId).then((c) => {
      if (c?.governance_thresholds) setThresholds(c.governance_thresholds);
    });
  }, [workspaceId]);

  useEffect(() => {
    apiClient.get<{ data: GovernanceHealthScore }>(`/workspaces/${workspaceId}/governance/health`)
      .then((json) => setHealth(json.data || null))
      .catch(() => {});
  }, [workspaceId]);

  const score = health?.health_score ?? 0;
  const color =
    score >= thresholds.excellent
      ? "text-green-400"
      : score >= thresholds.needs_attention
        ? "text-amber-400"
        : "text-red-400";
  const bgColor =
    score >= thresholds.excellent
      ? "bg-green-500/10"
      : score >= thresholds.needs_attention
        ? "bg-amber-500/10"
        : "bg-red-500/10";

  return (
    <div className="rounded-lg border border-card-border bg-card p-5 neo-depth-zinc card-hover hover-glow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Governance</h2>
        <Link href={`/workspace/${workspaceId}/governance`} className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors">
          Details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {!health ? (
        <div className="py-6 text-center">
          <Shield className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-2 text-xs text-muted">No audit data yet</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", bgColor)}>
            <span className={cn("text-lg font-bold", color)}>{score}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {score >= thresholds.excellent
                ? "Excellent"
                : score >= thresholds.needs_attention
                  ? "Needs Attention"
                  : "Poor"}
            </p>
            <div className="mt-1 flex gap-3 text-[11px] text-muted">
              <span>{health.duplicate_count} dupes</span>
              <span>{health.orphan_count} orphans</span>
              <span>{health.stale_count} stale</span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted">Last audit</p>
          </div>
        </div>
      )}
    </div>
  );
}
