"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { formatRelativeTime } from "@/lib/utils";
import { Archive } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Entity } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";

export default function ArchivePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { tokens } = useAuthStore();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokens?.access_token) return;
    apiClient.get<{ data: Entity[] }>(`/entities/?workspace_id=${workspaceId}&archived=true`)
      .then((json) => {
        setEntities(json.data || []);
      })
      .finally(() => setLoading(false));
  }, [tokens, workspaceId]);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Archive</h1>
        <p className="text-sm text-zinc-500">Archived entities</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : entities.length === 0 ? (
        <div className="py-12 text-center">
          <Archive className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-2 text-sm text-zinc-500">No archived entities</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entities.map((entity) => (
            <Link
              key={entity.id}
              href={`/workspace/${workspaceId}/entity/${entity.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition-colors hover:bg-zinc-800/50"
            >
              <div>
                <p className="text-sm font-medium text-white">{entity.title || "Untitled"}</p>
                <p className="text-xs text-zinc-500">Archived {formatRelativeTime(entity.archived_at || entity.updated_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
