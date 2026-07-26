"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useGovernance } from "@/hooks/useGovernance";
import type { GovernanceHealthScore, GovernanceReport as GovernanceReportType, Job } from "@/lib/types";
import { useWorkspaceContext } from "@/lib/workspace-context";
import { GovernanceReport } from "@/components/governance/GovernanceReport";
import { HealthScore } from "@/components/governance/HealthScore";
import IssueCard from "@/components/governance/IssueCard";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Shield,
  AlertTriangle,
  Copy,
  Clock,
  RefreshCw,
  CheckCircle,
  Link,
  Type,
  HardDrive,
  Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import ApprovalCard from "@/components/governance/ApprovalCard";
import ReviewWorkflow from "@/components/governance/ReviewWorkflow";
import { useAuthStore } from "@/stores/authStore";
import { configService } from "@/lib/services/configService";

export default function GovernancePage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;
  const { currentWorkspace } = useWorkspaceContext();

  const [health, setHealth] = useState<GovernanceHealthScore | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ name: string; count: number; entity_ids?: string[] }>>([]);
  const [orphans, setOrphans] = useState<Array<{ id: string; name: string | null; updated_at: string }>>([]);
  const [stale, setStale] = useState<Array<{ id: string; name: string | null; updated_at: string }>>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<Array<{ entity_id: string; entity_title: string; broken_ref: string }>>([]);
  const [namingIssues, setNamingIssues] = useState<Array<{ entity_id: string; entity_title: string; issue: string }>>([]);
  const [sizeWarnings, setSizeWarnings] = useState<Array<{ entity_id: string; entity_title: string; block_count: number }>>([]);

  const [schedule, setSchedule] = useState("off");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [governanceThresholds, setGovernanceThresholds] = useState({ excellent: 90, needs_attention: 70 });

  const { getHealth, getDuplicates, getOrphans, getStale, generateReport } = useGovernance(workspaceId);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [getHealth]);

  const fetchIssues = useCallback(async () => {
    try {
      const [dupData, orphanData, staleData] = await Promise.all([
        getDuplicates(),
        getOrphans(),
        getStale(),
      ]);
      if (dupData) {
        setDuplicates(dupData?.duplicate_entities ?? []);
      }
      if (orphanData) {
        setOrphans(orphanData?.orphans ?? []);
      }
      if (staleData) {
        setStale(staleData?.stale ?? []);
      }
    } catch {
      // handle error
    }
  }, [getDuplicates, getOrphans, getStale]);

  const fetchExtraCategories = useCallback(async () => {
    if (!tokens?.access_token) return;
    Promise.allSettled([
      apiClient.get<{ data: { items: Array<{ entity_id: string; entity_title: string; broken_ref: string }> } }>(`/workspaces/${workspaceId}/governance/broken-links`),
      apiClient.get<{ data: { items: Array<{ entity_id: string; entity_title: string; issue: string }> } }>(`/workspaces/${workspaceId}/governance/naming-issues`),
      apiClient.get<{ data: { items: Array<{ entity_id: string; entity_title: string; block_count: number }> } }>(`/workspaces/${workspaceId}/governance/size-warnings`),
    ]).then(([bl, ni, sw]) => {
      if (bl.status === "fulfilled" && bl.value.data?.items) setBrokenLinks(bl.value.data.items);
      if (ni.status === "fulfilled" && ni.value.data?.items) setNamingIssues(ni.value.data.items);
      if (sw.status === "fulfilled" && sw.value.data?.items) setSizeWarnings(sw.value.data.items);
    });
  }, [tokens, workspaceId]);

  const fetchJobs = useCallback(async () => {
    if (!tokens?.access_token) return;
    try {
      const json = await apiClient.get<{ data: Job[] }>(`/workspaces/${workspaceId}/jobs?status=completed`);
      setJobs(json.data ?? []);
    } catch {
      // handle error
    }
  }, [tokens, workspaceId]);

  const fetchSchedule = useCallback(async () => {
    if (!tokens?.access_token) return;
    try {
      const json = await apiClient.get<{ schedule?: string }>(`/workspaces/${workspaceId}/settings/governance`);
      setSchedule(json?.schedule ?? "off");
    } catch {
      setSchedule("off");
    }
  }, [tokens, workspaceId]);

  const handleScheduleChange = async (value: string) => {
    const previous = schedule;
    setSchedule(value);
    try {
      await apiClient.put(`/workspaces/${workspaceId}/settings/governance`, { schedule: value.toLowerCase() });
    } catch {
      setSchedule(previous);
      toast.error("Failed to update scan schedule");
    }
  };

  useEffect(() => {
    configService.get(workspaceId).then((c) => {
      if (c?.governance_thresholds) setGovernanceThresholds(c.governance_thresholds);
    });
  }, [workspaceId]);

  useEffect(() => {
    fetchHealth();
    fetchJobs();
    fetchIssues();
    fetchExtraCategories();
    fetchSchedule();
  }, [fetchHealth, fetchJobs, fetchIssues, fetchExtraCategories, fetchSchedule]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateReport();
      await fetchHealth();
      await fetchIssues();
      await fetchExtraCategories();
    } finally {
      setGenerating(false);
    }
  };

  const handleExportReport = () => {
    const workspaceName = currentWorkspace?.name || "Workspace";
    const report = `# Governance Report — ${workspaceName}
Generated: ${new Date().toISOString()}

## Health Score: ${health?.health_score || 0}/100

## Summary
- Duplicates: ${health?.duplicate_count || 0}
- Orphans: ${health?.orphan_count || 0}
- Stale: ${health?.stale_count || 0}
- Broken Links: ${brokenLinks.length}
- Naming Issues: ${namingIssues.length}
- Size Warnings: ${sizeWarnings.length}

## Duplicates
${duplicates.map((d) => `- ${d.name} (${d.count} duplicates)`).join("\n") || "None"}

## Orphans
${orphans.map((o) => `- ${o.name || "Untitled"}`).join("\n") || "None"}

## Stale Content
${stale.map((s) => `- ${s.name || "Untitled"} (last updated: ${s.updated_at})`).join("\n") || "None"}

## Broken Links
${brokenLinks.map((b) => `- ${b.entity_title}: references ${b.broken_ref}`).join("\n") || "None"}

## Naming Issues
${namingIssues.map((n) => `- ${n.entity_title}: ${n.issue}`).join("\n") || "None"}

## Size Warnings
${sizeWarnings.map((s) => `- ${s.entity_title}: ${s.block_count} blocks`).join("\n") || "None"}
`;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `governance-report-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const governanceReport: GovernanceReportType | null = health
    ? {
        id: "",
        workspace_id: workspaceId,
        type: "compliance",
        title: "Governance Report",
        status: "completed",
        data: { health_score: health.health_score, duplicate_count: health.duplicate_count, orphan_count: health.orphan_count, stale_count: health.stale_count, duplicates, orphans, stale, entity_count: health.entity_count, block_count: health.block_count, relation_count: health.relation_count },
        params: {},
        created_by: null,
        created_at: new Date().toISOString(),
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      }
    : null;

  const healthScore = health?.health_score ?? 0;

  const allIssues = [
    ...duplicates.map((d, i) => ({
      id: `dup-${i}`,
      title: d.name,
      category: "duplicate" as const,
      severity: "medium" as const,
      description: `${d.count} similar versions found`,
      entity_id: d.entity_ids?.[0],
    })),
    ...orphans.map((o) => ({
      id: `orphan-${o.id}`,
      title: o.name || "Untitled entity",
      category: "orphan" as const,
      severity: "low" as const,
      description: "No relations connected",
      entity_id: o.id,
      entity_title: o.name || undefined,
    })),
    ...stale.map((s) => ({
      id: `stale-${s.id}`,
      title: s.name || "Untitled entity",
      category: "stale" as const,
      severity: "low" as const,
      description: `Last updated ${formatRelativeTime(s.updated_at)}`,
      entity_id: s.id,
      entity_title: s.name || undefined,
    })),
    ...brokenLinks.map((bl, i) => ({
      id: `bl-${i}`,
      title: bl.entity_title,
      category: "broken_link" as const,
      severity: "high" as const,
      description: `References missing: ${bl.broken_ref}`,
      entity_id: bl.entity_id,
    })),
    ...namingIssues.map((ni, i) => ({
      id: `ni-${i}`,
      title: ni.entity_title,
      category: "naming" as const,
      severity: "low" as const,
      description: ni.issue,
      entity_id: ni.entity_id,
    })),
    ...sizeWarnings.map((sw, i) => ({
      id: `sw-${i}`,
      title: sw.entity_title,
      category: "size" as const,
      severity: "medium" as const,
      description: `${sw.block_count} blocks`,
      entity_id: sw.entity_id,
    })),
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground display-heading">Governance</h1>
          <p className="mt-1 text-step-3 text-muted">Workspace health and data quality</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-black hover:bg-surface disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
            {generating ? "Generating..." : "Run Audit"}
          </button>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 py-6">
          <Skeleton variant="rectangular" className="h-32 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton variant="rectangular" className="h-48 w-full rounded-xl" />
        </div>
      ) : !health ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="h-12 w-12 text-muted" />
          <p className="mt-3 text-step-3 text-muted">No governance report yet</p>
          <p className="mt-1 text-step-1 text-muted">Run an audit to analyze workspace health</p>
        </div>
      ) : (
        <>
          {/* Health Score Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <HealthScore score={healthScore} size="lg" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Health Score</h2>
                  <p className="text-step-3 text-muted">
                    {healthScore >= governanceThresholds.excellent
                      ? "Excellent — your workspace is in great shape"
                      : healthScore >= governanceThresholds.needs_attention
                        ? "Needs attention — some issues detected"
                        : "Poor — significant issues need resolution"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-step-1 text-muted">Last audit</p>
                <p className="text-step-3 text-foreground">{formatRelativeTime(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          {/* Score Trend */}
          <ReviewWorkflow workspaceId={workspaceId} />

           {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-amber-400" />
                  <span className="text-step-3 text-muted">Duplicates</span>
                </div>
                <span className="text-lg font-bold text-foreground">{health.duplicate_count}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">Potential duplicate entities</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-step-3 text-muted">Orphans</span>
                </div>
                <span className="text-lg font-bold text-foreground">{health.orphan_count}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">Entities with no relations</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-step-3 text-muted">Stale</span>
                </div>
                <span className="text-lg font-bold text-foreground">{health.stale_count}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">Not updated in 90+ days</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-orange-400" />
                  <span className="text-step-3 text-muted">Broken Links</span>
                </div>
                <span className="text-lg font-bold text-foreground">{brokenLinks.length}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">References to missing entities</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-yellow-400" />
                  <span className="text-step-3 text-muted">Naming Issues</span>
                </div>
                <span className="text-lg font-bold text-foreground">{namingIssues.length}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">Inconsistent or invalid names</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-purple-400" />
                  <span className="text-step-3 text-muted">Size Warnings</span>
                </div>
                <span className="text-lg font-bold text-foreground">{sizeWarnings.length}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">Entities exceeding size limits</p>
            </div>
          </div>

          {/* Issues */}
          {allIssues.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Issues</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {allIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    category={issue.category}
                    title={issue.title}
                    description={issue.description}
                    entityTitle={"entity_title" in issue ? issue.entity_title : undefined}
                    entityId={issue.entity_id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Compliance Report */}
          {governanceReport && <GovernanceReport report={governanceReport as GovernanceReportType} workspaceId={params.id as string} />}

          {/* Approval Card — Unified Issues */}
          {governanceReport && <ApprovalCard report={governanceReport} workspaceId={workspaceId} />}

          {/* Scan Schedule */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-foreground display-heading">Scan Schedule</h3>
            <p className="mt-1 text-step-1 text-muted">Automatically run governance audits on a schedule</p>
            <div className="mt-3 flex gap-2">
              {["Off", "Daily", "Weekly", "Monthly"].map((freq) => {
                const isActive = schedule === freq.toLowerCase();
                return (
                  <button
                    key={freq}
                    onClick={() => handleScheduleChange(freq)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                      isActive
                        ? "border-white bg-card text-black font-medium"
                        : "border-border text-muted hover:bg-surface hover:text-foreground"
                    )}
                  >
                    {freq}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Jobs Section */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Completed Jobs</h2>
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-step-3 font-medium text-foreground capitalize">
                      {job.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-step-1 text-muted">
                      Completed {formatRelativeTime(job.completed_at ?? job.created_at)}
                    </p>
                  </div>
                </div>
                {job.result && (
                  <p className="max-w-xs truncate text-step-1 text-muted">
                    {JSON.stringify(job.result).slice(0, 80)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
