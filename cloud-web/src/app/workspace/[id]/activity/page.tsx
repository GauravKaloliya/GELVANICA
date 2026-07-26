"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useActivity } from "@/hooks/useActivity";
import type { ActivityEntry } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Activity,
  FileText,
  Link2,
  MessageSquare,
  Tag,
  Upload,
  Trash2,
  Edit3,
  GitBranch,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  create: { icon: FileText, color: "text-green-400", label: "Created" },
  update: { icon: Edit3, color: "text-blue-400", label: "Updated" },
  delete: { icon: Trash2, color: "text-red-400", label: "Deleted" },
  archive: { icon: Trash2, color: "text-amber-400", label: "Archived" },
  comment: { icon: MessageSquare, color: "text-purple-400", label: "Commented" },
  relation: { icon: Link2, color: "text-cyan-400", label: "Related" },
  tag: { icon: Tag, color: "text-pink-400", label: "Tagged" },
  upload: { icon: Upload, color: "text-indigo-400", label: "Uploaded" },
  branch: { icon: GitBranch, color: "text-orange-400", label: "Branched" },
};

function getActionConfig(action: string) {
  const key = Object.keys(ACTION_CONFIG).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_CONFIG[key] : { icon: Activity, color: "text-muted", label: action };
}

export default function ActivityPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages] = useState(1);
  const [filter, setFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { listEntries } = useActivity(workspaceId);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEntries();
      setActivities(data || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [listEntries]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchActivities]);

  const uniqueActions = [...new Set(activities.map((a) => a.action))];
  const uniqueUsers = [...new Set(activities.map((a) => a.user_id).filter(Boolean))] as string[];

  const filteredActivities = activities.filter((a) => {
    if (filter && a.action !== filter) return false;
    if (userFilter && a.user_id !== userFilter) return false;
    if (entityFilter && (!a.entity_id || !a.entity_id.toLowerCase().includes(entityFilter.toLowerCase()))) return false;
    if (dateFrom && a.created_at < dateFrom) return false;
    if (dateTo && a.created_at > dateTo) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground display-heading">Activity Log</h1>
          <p className="mt-1 text-step-3 text-muted">Track all changes in your workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              autoRefresh
                ? "bg-green-500/10 text-green-400"
                : "bg-surface text-muted hover:text-foreground"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto-refreshing" : "Auto-refresh"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {uniqueActions.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted" />
            <button
              onClick={() => { setFilter(null); setPage(1); }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                !filter ? "bg-card text-foreground" : "bg-surface text-muted hover:text-foreground"
              )}
            >
              All
            </button>
            {uniqueActions.map((action) => {
              const config = getActionConfig(action);
              return (
                <button
                  key={action}
                  onClick={() => { setFilter(action); setPage(1); }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    filter === action ? "bg-card text-foreground" : "bg-surface text-muted hover:text-foreground"
                  )}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {uniqueUsers.length > 0 && (
            <select
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">All users</option>
              {uniqueUsers.map((uid) => (
                <option key={uid} value={uid}>{uid.slice(0, 8)}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            placeholder="Filter by entity..."
            className="w-40 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <span className="text-step-1 text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      {loading && filteredActivities.length === 0 ? (
        <div className="space-y-1 py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-lg px-3 py-3">
              <Skeleton variant="circular" width={36} height={36} />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-16 text-center">
          <Activity className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 text-step-3 text-muted">No activity yet</p>
          <p className="mt-1 text-step-1 text-muted">Changes will appear here as they happen</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-surface" />

          <div className="space-y-1">
            {filteredActivities.map((entry) => {
              const config = getActionConfig(entry.action);
              const Icon = config.icon;
              return (
                <div
                  key={entry.id}
                  className="relative flex items-start gap-4 rounded-lg px-3 py-3 hover:bg-card"
                >
                  <div
                    className={cn(
                      "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-step-3 text-foreground">{config.label}</span>
                      {"title" in (entry.details || {}) && (
                        <Link
                          href={`/workspace/${workspaceId}/entity/${entry.entity_id}`}
                          className="text-sm font-medium text-foreground hover:underline truncate"
                        >
                          {String((entry.details as Record<string, unknown>).title)}
                        </Link>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
                      <span>{formatRelativeTime(entry.created_at)}</span>
                      {entry.user_id && <span>User {entry.user_id.slice(0, 8)}</span>}
                      {entry.resource_id && <span>{entry.resource_type ? entry.resource_type.charAt(0).toUpperCase() + entry.resource_type.slice(1) : "Resource"} {entry.resource_id.slice(0, 8)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-step-1 text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
