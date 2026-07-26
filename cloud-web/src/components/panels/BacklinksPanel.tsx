"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import type { Relation } from "@/lib/types";
import { ArrowLeftRight, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface BacklinksPanelProps {
  entityId: string;
  workspaceId: string;
}

interface BacklinkRelation extends Relation {
  source_title?: string;
}

export default function BacklinksPanel({ entityId, workspaceId }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<BacklinkRelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;

    const fetchBacklinks = async () => {
      try {
        const json = await apiClient.get<{ data: BacklinkRelation[] }>(`/workspaces/${workspaceId}/relations/backlinks/${entityId}`);
        const relations: BacklinkRelation[] = json.data || [];

        // Fetch source entity titles in parallel
        const sourceIds = [...new Set(relations.map((r) => r.source_id))];
        const titleMap: Record<string, string> = {};

        await Promise.all(
          sourceIds.map(async (id) => {
            try {
              const entityJson = await apiClient.get<{ data: { name?: string } }>(`/workspaces/${workspaceId}/entities/${id}`);
              titleMap[id] = entityJson.data?.name || "Untitled";
            } catch {
              titleMap[id] = "Unknown";
            }
          })
        );

        setBacklinks(
          relations.map((r) => ({
            ...r,
            source_title: titleMap[r.source_id] || "Unknown",
          }))
        );
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchBacklinks();
  }, [entityId]);

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md px-2 py-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton width="70%" height={12} />
              <Skeleton width="30%" height={10} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="py-8 text-center">
        <ArrowLeftRight className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 text-xs text-muted">No incoming links yet</p>
        <p className="mt-1 text-[11px] text-muted">
          Other entities that reference this one will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {backlinks.map((link) => (
        <Link
          key={link.id}
          href={`/workspace/${workspaceId}/entity/${link.source_id}`}
          className="flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-surface group"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground group-hover:text-foreground">
              {link.source_title}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">
              {link.type}
            </p>
          </div>
          <ExternalLink className="h-3 w-3 shrink-0 text-muted group-hover:text-foreground" />
        </Link>
      ))}
    </div>
  );
}
