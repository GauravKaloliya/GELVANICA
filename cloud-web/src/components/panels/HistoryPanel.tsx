"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import type { EntityVersion } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Loader2, RotateCcw, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

interface HistoryPanelProps {
  entityId: string;
}

export default function HistoryPanel({ entityId }: HistoryPanelProps) {
  const [versions, setVersions] = useState<EntityVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    apiClient.get<{ data: EntityVersion[] }>(`/entities/${entityId}/versions?per_page=20`)
      .then((json) => setVersions(json.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityId]);

  const handleRestore = useCallback(async (versionId: string) => {
    setRestoring(versionId);
    try {
      await apiClient.post(`/versions/restore/${versionId}`);
      toast.success("Version restored");
      const json = await apiClient.get<{ data: EntityVersion[] }>(`/entities/${entityId}/versions?per_page=20`);
      setVersions(json.data || []);
    } catch {
      toast.error("Restore failed");
    }
    setRestoring(null);
  }, [entityId]);

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg p-2">
            <Skeleton variant="circular" width={8} height={8} className="mt-1.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton width="40%" height={12} />
              <Skeleton width="25%" height={10} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="py-8 text-center">
        <Clock className="mx-auto h-6 w-6 text-zinc-700" />
        <p className="mt-2 text-xs text-zinc-600">No version history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {versions.map((version, i) => (
        <div
          key={version.id}
          className="group relative flex items-start gap-3 rounded-lg border border-transparent p-2 hover:border-zinc-800 hover:bg-zinc-900/50"
        >
          <div className="relative mt-1.5">
            <div className={cn("h-2 w-2 rounded-full", i === 0 ? "bg-green-400" : "bg-zinc-700")} />
            {i < versions.length - 1 && (
              <div className="absolute left-1/2 top-2 h-6 w-px -translate-x-1/2 bg-zinc-800" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">Version {versions.length - i}</p>
            <p className="text-[10px] text-zinc-600">{formatRelativeTime(version.created_at)}</p>
            {version.changeset_id && (
              <span className="inline-block mt-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">
                cs {version.changeset_id.slice(0, 6)}
              </span>
            )}
          </div>
          {i > 0 && (
            <button
              onClick={() => handleRestore(version.id)}
              disabled={restoring === version.id}
              className="opacity-0 group-hover:opacity-100 shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-opacity"
              title="Restore this version"
              aria-label="Restore this version"
            >
              {restoring === version.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
