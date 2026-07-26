"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { configService } from "@/lib/services/configService";
import type { GovernanceCategory, GovernanceThresholds } from "@/lib/services/configService";
import type { GovernanceReport as GovernanceReportType } from "@/lib/types";
import { CheckCircle, AlertTriangle, Shield } from "lucide-react";

interface GovernanceReportProps {
  report: GovernanceReportType;
  workspaceId: string;
  className?: string;
}

interface ReportCheck {
  label: string;
  passed: boolean;
  detail: string;
  category: "structure" | "content" | "health";
}

const CATEGORY_COLORS: Record<string, string> = {
  structure: "text-blue-400",
  content: "text-purple-400",
  health: "text-green-400",
};

export function GovernanceReport({ report, workspaceId, className }: GovernanceReportProps) {
  const [governanceCategories, setGovernanceCategories] = useState<GovernanceCategory[]>([]);
  const [thresholds, setThresholds] = useState<GovernanceThresholds | null>(null);

  useEffect(() => {
    configService.get(workspaceId).then(c => {
      setGovernanceCategories(c.governance_categories ?? []);
      setThresholds(c.governance_thresholds ?? null);
    }).catch(() => {});
  }, [workspaceId]);

  const data = report.data as { health_score?: number; duplicate_count?: number; orphan_count?: number; stale_count?: number; entity_count?: number; block_count?: number; relation_count?: number } | null;
  const duplicateCount = data?.duplicate_count ?? 0;
  const orphanCount = data?.orphan_count ?? 0;
  const staleCount = data?.stale_count ?? 0;
  const healthScore = data?.health_score ?? 0;
  const needsAttentionThreshold = thresholds?.needs_attention ?? 70;

  const checks: ReportCheck[] = [
    {
      label: "No duplicate entities",
      passed: duplicateCount === 0,
      detail: duplicateCount === 0
        ? "All entities are unique"
        : `${duplicateCount} potential duplicates need review`,
      category: "structure",
    },
    {
      label: "All entities have relations",
      passed: orphanCount === 0,
      detail: orphanCount === 0
        ? "No orphaned entities"
        : `${orphanCount} entities lack connections`,
      category: "structure",
    },
    {
      label: "Content freshness",
      passed: staleCount === 0,
      detail: staleCount === 0
        ? "All content is up to date"
        : `${staleCount} entities stale (90+ days)`,
      category: "content",
    },
    {
      label: "Health score threshold",
      passed: healthScore >= needsAttentionThreshold,
      detail: `Current score: ${healthScore}/100 (threshold: ${needsAttentionThreshold})`,
      category: "health",
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const allPassed = passedCount === checks.length;

  const groupedChecks = checks.reduce<Record<string, ReportCheck[]>>((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {});

  const categoryLabelMap = governanceCategories.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.label;
    return acc;
  }, {});

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted" />
          <h3 className="text-sm font-semibold text-foreground">Governance Report</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            allPassed
              ? "bg-green-500/10 text-green-400"
              : "bg-amber-500/10 text-amber-400"
          )}
        >
          {passedCount}/{checks.length} passed
        </span>
      </div>

      {Object.entries(groupedChecks).map(([category, categoryChecks]) => (
        <div key={category} className="space-y-2">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[category] || "text-muted"}`}>
            {categoryLabelMap[category] || category}
          </p>
          {categoryChecks.map((check, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                check.passed
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-amber-500/20 bg-amber-500/5"
              )}
            >
              {check.passed ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white">{check.label}</p>
                <p className="text-[11px] text-muted">{check.detail}</p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase",
                  check.passed ? "text-green-400" : "text-amber-400"
                )}
              >
                {check.passed ? "Pass" : "Action"}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}


