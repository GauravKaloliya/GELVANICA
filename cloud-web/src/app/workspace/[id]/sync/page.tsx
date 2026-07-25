"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSync } from "@/hooks/useSync";
import { useAuthStore } from "@/stores/authStore";
import { useSyncStore, type SyncDevice } from "@/stores/syncStore";
import { cn, formatRelativeTime } from "@/lib/utils";
import { RefreshCw, Check, AlertCircle, Clock, Monitor, Smartphone, Globe, ArrowDown, ArrowUp, Pause, Wifi, WifiOff, Zap, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  idle: { label: "Idle", color: "text-zinc-400", icon: Pause },
  syncing: { label: "Syncing", color: "text-blue-400", icon: RefreshCw },
  conflict: { label: "Conflicts", color: "text-amber-400", icon: AlertCircle },
  offline: { label: "Offline", color: "text-red-400", icon: WifiOff },
};

export default function SyncPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const {
    status,
    pendingChanges,
    conflictCount,
    lastSyncAt,
    devices,
    conflicts,
    operations,
    isSyncing,
    error,
    loadOperations,
    ackOperation,
    resolveConflict,
  } = useSync(workspaceId);

  const [autoSync, setAutoSync] = useState(true);
  const [autoResolveEnabled, setAutoResolveEnabled] = useState(true);
  const [autoResolvedCount, setAutoResolvedCount] = useState(0);
  const token = useAuthStore((s) => s.tokens?.access_token);

  const conflictEntityKeys = new Set(
    conflicts.map((c) => `${c.entityType}:${c.entityId}`)
  );
  const pendingNonConflicts = operations.filter(
    (op) => op.status === "pending" && !conflictEntityKeys.has(`${op.entity_type}:${op.entity_id}`)
  );

  const resolveAllNonConflicts = async () => {
    let count = 0;
    for (const op of pendingNonConflicts) {
      await ackOperation(op.id);
      count++;
    }
    setAutoResolvedCount((prev) => prev + count);
    toast.success(`Resolved ${count} non-conflict${count > 1 ? "s" : ""}`);
  };

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(loadOperations, 15000);
    return () => clearInterval(interval);
  }, [autoSync, loadOperations]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const devJson = await apiClient.get<{ data: SyncDevice[] }>(`/sync/devices?workspace_id=${workspaceId}`);
        useSyncStore.setState({ devices: devJson.data || [] });
      } catch { /* devices may not be available */ }
    })();
  }, [token, workspaceId]);

  useEffect(() => {
    if (!autoResolveEnabled || pendingNonConflicts.length === 0) return;
    let cancelled = false;
    (async () => {
      let count = 0;
      for (const op of pendingNonConflicts) {
        if (cancelled) break;
        await ackOperation(op.id);
        count++;
      }
      if (!cancelled) {
        setAutoResolvedCount((p) => p + count);
        if (count > 0) toast.success(`Auto-resolved ${count} operation${count > 1 ? "s" : ""}`);
      }
    })();
    return () => { cancelled = true; };
  }, [autoResolveEnabled, pendingNonConflicts, ackOperation]);

  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sync</h1>
          <p className="mt-1 text-sm text-zinc-500">Real-time sync across all devices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoResolveEnabled(!autoResolveEnabled)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              autoResolveEnabled
                ? "bg-violet-500/10 text-violet-400"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"
            )}
          >
            {autoResolveEnabled ? <Zap className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Auto-Resolve {autoResolveEnabled ? "On" : "Off"}
          </button>
          {pendingNonConflicts.length > 0 && (
            <button
              onClick={resolveAllNonConflicts}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            >
              <Check className="h-3.5 w-3.5" />
              Resolve All Non-Conflicts ({pendingNonConflicts.length})
            </button>
          )}
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              autoSync
                ? "bg-green-500/10 text-green-400"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"
            )}
          >
            {autoSync ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {autoSync ? "Live" : "Paused"}
          </button>
          <button
            onClick={() => loadOperations()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            Sync Now
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", { "bg-green-400": status === "idle", "bg-blue-400 animate-pulse": status === "syncing", "bg-amber-400": status === "conflict", "bg-red-400": status === "offline" })} />
            <span className="text-sm text-zinc-400">Status</span>
          </div>
          <p className={cn("mt-2 text-lg font-bold", statusInfo.color)}>{statusInfo.label}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-zinc-500" /><span className="text-sm text-zinc-400">Pending</span></div>
          <p className="mt-2 text-lg font-bold text-white">{pendingChanges}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 text-zinc-500" /><span className="text-sm text-zinc-400">Conflicts</span></div>
          <p className={cn("mt-2 text-lg font-bold", conflictCount > 0 ? "text-amber-400" : "text-white")}>{conflictCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 text-zinc-500" /><span className="text-sm text-zinc-400">Last Sync</span></div>
          <p className="mt-2 text-sm font-medium text-white">{lastSyncAt ? formatRelativeTime(lastSyncAt) : "Never"}</p>
        </div>
      </div>

      {autoResolvedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-400">
          <Zap className="h-3.5 w-3.5" />
          <span className="font-medium">{autoResolvedCount}</span> operation{autoResolvedCount > 1 ? "s" : ""} auto-resolved
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Connected Devices */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Connected Devices</h2>
        <p className="mt-1 text-sm text-zinc-500">Devices syncing with this workspace</p>
        {devices.length === 0 ? (
          <div className="mt-4 py-6 text-center">
            <Monitor className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-500">No devices connected</p>
            <p className="text-xs text-zinc-600">Devices will appear here when they sync</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
                <div className="flex items-center gap-3">
                  {device.type === "desktop" ? <Monitor className="h-5 w-5 text-zinc-400" /> :
                   device.type === "mobile" ? <Smartphone className="h-5 w-5 text-zinc-400" /> :
                   <Globe className="h-5 w-5 text-zinc-400" />}
                  <div>
                    <p className="text-sm font-medium text-white">{device.name}</p>
                    <p className="text-xs text-zinc-500">
                      Last sync: {device.lastSyncAt ? formatRelativeTime(device.lastSyncAt) : "Never"}
                    </p>
                  </div>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", device.status === "synced" ? "bg-green-500/10 text-green-400" : device.status === "syncing" ? "bg-blue-500/10 text-blue-400" : "bg-zinc-500/10 text-zinc-400")}>{device.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflicts Section */}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="text-lg font-semibold text-amber-400">Sync Conflicts ({conflicts.length})</h2>
          <div className="mt-4 space-y-4">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="rounded-lg border border-zinc-800 overflow-hidden">
                <div className="bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-400">
                  {conflict.entityType} — {conflict.entityId.slice(0, 8)}
                </div>
                <div className="grid grid-cols-2 divide-x divide-zinc-800">
                  <div className="p-3">
                    <p className="mb-1 text-[10px] font-medium uppercase text-blue-400">Local</p>
                    <pre className="text-xs text-zinc-300 overflow-auto max-h-32">{JSON.stringify(conflict.localVersion, null, 2)}</pre>
                  </div>
                  <div className="p-3">
                    <p className="mb-1 text-[10px] font-medium uppercase text-green-400">Cloud</p>
                    <pre className="text-xs text-zinc-300 overflow-auto max-h-32">{JSON.stringify(conflict.cloudVersion, null, 2)}</pre>
                  </div>
                </div>
                <div className="flex border-t border-zinc-800">
                  <button onClick={() => resolveConflict(token!, conflict.id, "local_wins")} className="flex-1 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/10">Keep Local</button>
                  <button onClick={() => resolveConflict(token!, conflict.id, "remote_wins")} className="flex-1 px-3 py-2 text-xs font-medium text-green-400 hover:bg-green-500/10 border-l border-zinc-800">Keep Cloud</button>
                  <button onClick={() => resolveConflict(token!, conflict.id, "manual")} className="flex-1 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 border-l border-zinc-800">Manual</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operations Timeline */}
      <div>
        <h2 className="mb-4 text-sm font-semibold text-white">Recent Operations</h2>
        {isSyncing && operations.length === 0 ? (
          <div className="space-y-3 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
                <Skeleton variant="circular" width={28} height={28} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : operations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 py-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-500">No sync operations yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {operations.slice(0, 50).map((op) => (
              <div
                key={op.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-900/50"
              >
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  op.operation_type.includes("create") ? "bg-green-500/10 text-green-400" :
                  op.operation_type.includes("delete") ? "bg-red-500/10 text-red-400" :
                  "bg-blue-500/10 text-blue-400"
                )}>
                  {op.operation_type.includes("create") ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : op.operation_type.includes("delete") ? (
                    <ArrowDown className="h-3.5 w-3.5" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300">
                    <span className="font-medium">{op.operation_type}</span>
                    {op.entity_type && <span className="text-zinc-500"> · {op.entity_type}</span>}
                  </p>
                  <p className="text-[11px] text-zinc-600">{formatRelativeTime(op.created_at)}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    op.status === "applied"
                      ? "bg-green-500/10 text-green-400"
                      : op.status === "acked"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-amber-500/10 text-amber-400"
                  )}
                >
                  {op.status}
                </span>
                {op.status === "pending" && (
                  <button
                    onClick={() => ackOperation(op.id)}
                    className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                    title="Acknowledge"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
