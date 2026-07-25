"use client";

import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { formatRelativeTime, formatFileSize, cn } from "@/lib/utils";
import {
  Database,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  HardDrive,
  Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface Backup {
  id: string;
  workspace_id: string;
  created_at: string;
  size: number;
  status: string;
  file_count?: number;
  entity_count?: number;
  download_url?: string;
}

interface BackupPanelProps {
  workspaceId: string;
}

export function BackupPanel({ workspaceId }: BackupPanelProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiClient.get<{ data: Backup[] | Backup }>('/backups/?workspace_id=' + workspaceId);
      const items = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
      setBackups(items);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      await apiClient.post("/backups/export-to-s3", { workspace_id: workspaceId });
      showMessage("success", "Backup created successfully");
      fetchBackups();
    } catch {
      showMessage("error", "Failed to create backup");
    } finally {
      setCreating(false);
    }
  }, [workspaceId, creating, fetchBackups, showMessage]);

  const handleRestore = useCallback(
    async (backupId: string) => {
      if (restoringId) return;
      setRestoringId(backupId);
      try {
        await apiClient.post(`/backups/${backupId}/restore`, { workspace_id: workspaceId });
        showMessage("success", "Workspace restored successfully");
      } catch {
        showMessage("error", "Failed to restore from backup");
      } finally {
        setRestoringId(null);
      }
    },
    [restoringId, showMessage, workspaceId]
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "in_progress":
        return "text-amber-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div>
      {message && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm",
            message.type === "success"
              ? "border-green-500/20 bg-green-500/5 text-green-400"
              : "border-red-500/20 bg-red-500/5 text-red-400"
          )}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          {creating ? "Creating..." : "Create Backup"}
        </button>
        <button
          onClick={fetchBackups}
          disabled={loading}
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-white disabled:opacity-50"
          title="Refresh"
          aria-label="Refresh backups"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton width={80} height={14} />
                    <Skeleton width={60} height={12} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton width={100} height={10} />
                    <Skeleton width={60} height={10} />
                    <Skeleton width={70} height={10} />
                  </div>
                </div>
                <Skeleton width={80} height={32} className="rounded-lg" />
              </div>
            ))}
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800/20 py-10">
            <HardDrive className="h-8 w-8 text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-500">No backups yet</p>
            <p className="text-xs text-zinc-600">Create your first backup to protect your data</p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{backup.id.slice(0, 8)}...</p>
                    <span className={cn("text-xs font-medium", statusColor(backup.status))}>
                      {backup.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                    <span>{formatRelativeTime(backup.created_at)}</span>
                    {backup.size != null && <span>{formatFileSize(backup.size)}</span>}
                    {backup.entity_count != null && <span>{backup.entity_count} entities</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {backup.download_url && (
                    <a
                      href={backup.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleRestore(backup.id)}
                    disabled={restoringId === backup.id}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-50"
                  >
                    {restoringId === backup.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
