"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { formatRelativeTime } from "@/lib/utils";
import { FileText, Clock } from "lucide-react";

interface RecentEntity {
  id: string;
  title: string | null;
  entity_type: string;
  updated_at: string;
}

interface RecentEntitiesProps {
  workspaceId: string;
  limit?: number;
}

export function RecentEntities({ workspaceId, limit = 5 }: RecentEntitiesProps) {
  const [entities, setEntities] = useState<RecentEntity[]>([]);

  useEffect(() => {
    apiClient.get<{ data: RecentEntity[] }>(`/entities/?workspace_id=${workspaceId}&limit=${limit}&sort=updated_at&order=desc`)
      .then((json) => {
        if (json.data) setEntities(json.data);
      })
      .catch(() => {});
  }, [workspaceId, limit]);

  if (entities.length === 0) return null;

  return (
    <div className="space-y-1">
      {entities.map((entity) => (
        <Link
          key={entity.id}
          href={`/workspace/${workspaceId}/entity/${entity.id}`}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-zinc-800/50"
        >
          <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
          <span className="min-w-0 flex-1 truncate text-zinc-300">
            {entity.title || "Untitled"}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-600">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(entity.updated_at)}
          </span>
        </Link>
      ))}
    </div>
  );
}
