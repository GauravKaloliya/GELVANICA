"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/types";
import { Activity, FileText, Link2, MessageSquare, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const ACTION_ICONS: Record<string, React.ElementType> = {
  entity_create: FileText,
  entity_update: FileText,
  entity_delete: FileText,
  block_create: FileText,
  relation_create: Link2,
  relation_delete: Link2,
  comment_create: MessageSquare,
  tag_create: Tag,
};

const ACTION_COLORS: Record<string, string> = {
  entity_create: "text-green-400 bg-green-500/10",
  entity_update: "text-blue-400 bg-blue-500/10",
  entity_delete: "text-red-400 bg-red-500/10",
  block_create: "text-muted bg-surface",
  relation_create: "text-purple-400 bg-purple-500/10",
  comment_create: "text-amber-400 bg-amber-500/10",
};

interface ActivityFeedProps {
  workspaceId: string;
  limit?: number;
}

export default function ActivityFeed({ workspaceId, limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const json = await apiClient.get<{ data: ActivityEntry[] }>(
          `/workspaces/${workspaceId}/activity?per_page=${limit}`
        );
        setActivities(json.data || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [workspaceId, limit]);

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-md px-3 py-2.5">
            <Skeleton variant="circular" width={24} height={24} className="mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton width="50%" height={12} />
              <Skeleton width="35%" height={10} />
              <Skeleton width="20%" height={10} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <Activity className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 text-xs text-muted">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((entry) => {
        const Icon = ACTION_ICONS[entry.action] || Activity;
        const colorClass = ACTION_COLORS[entry.action] || "text-muted bg-surface";

        return (
          <Link
            key={entry.id}
            href={`/workspace/${workspaceId}/entity/${entry.entity_id}`}
            className="flex items-start gap-3 rounded-md px-3 py-2.5 hover:bg-surface group"
          >
            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
              <Icon className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-foreground group-hover:text-foreground">
                {entry.action.replace(/_/g, " ")}
              </p>
              {typeof entry.details === "object" && entry.details !== null && "title" in entry.details && (
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                  {String((entry.details as Record<string, unknown>).title)}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-muted">
                {formatRelativeTime(entry.created_at)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
