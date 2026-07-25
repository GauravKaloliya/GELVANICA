"use client";

import { cn } from "@/lib/utils";
import type { GovernanceReport as GovernanceReportType } from "@/lib/types";
import { CheckCircle, AlertTriangle, Shield } from "lucide-react";

interface GovernanceReportProps {
  report: GovernanceReportType;
  className?: string;
}

interface ReportCheck {
  label: string;
  passed: boolean;
  detail: string;
  category: "structure" | "content" | "health";
}

const CATEGORY_LABELS: Record<string, string> = {
  structure: "Structure",
  content: "Content",
  health: "Health",
};

const CATEGORY_COLORS: Record<string, string> = {
  structure: "text-blue-400",
  content: "text-purple-400",
  health: "text-green-400",
};

export function GovernanceReport({ report, className }: GovernanceReportProps) {
  const checks: ReportCheck[] = [
    {
      label: "No duplicate entities",
      passed: report.duplicate_count === 0,
      detail: report.duplicate_count === 0
        ? "All entities are unique"
        : `${report.duplicate_count} potential duplicates need review`,
      category: "structure",
    },
    {
      label: "All entities have relations",
      passed: report.orphan_count === 0,
      detail: report.orphan_count === 0
        ? "No orphaned entities"
        : `${report.orphan_count} entities lack connections`,
      category: "structure",
    },
    {
      label: "Content freshness",
      passed: report.stale_count === 0,
      detail: report.stale_count === 0
        ? "All content is up to date"
        : `${report.stale_count} entities stale (90+ days)`,
      category: "content",
    },
    {
      label: "Health score threshold",
      passed: report.health_score >= 70,
      detail: `Current score: ${report.health_score}/100 (threshold: 70)`,
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

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Governance Report</h3>
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
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[category] || "text-zinc-500"}`}>
            {CATEGORY_LABELS[category] || category}
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
                <p className="text-[11px] text-zinc-500">{check.detail}</p>
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

export default GovernanceReport;
