"use client";

import { useState, useEffect, useCallback } from "react";
import { useSyncStore } from "@/stores/syncStore";
import { useAuthStore } from "@/stores/authStore";
import { settingsService } from "@/lib/services/settingsService";
import { configService } from "@/lib/services/configService";
import type { SyncFrequency, ConflictStrategy } from "@/lib/services/configService";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Monitor,
  Smartphone,
  Globe,
  Loader2,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
  Trash2,
  Clock,
} from "lucide-react";

interface SyncSettingsProps {
  workspaceId: string;
}

const DEVICE_ICONS: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  web: Globe,
};

export function SyncSettings({ workspaceId }: SyncSettingsProps) {
  const { tokens } = useAuthStore();
  const {
    status,
    devices,
    conflicts,
    lastSyncAt,
    isSyncing,
    offlineQueue,
    fetchDevices,
    fetchConflicts,
    processOfflineQueue,
    fetchOperations,
  } = useSyncStore();

  const token = tokens?.access_token;

  const [autoSync, setAutoSync] = useState(false);
  const [frequency, setFrequency] = useState("");
  const [conflictStrategy, setConflictStrategy] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);
  const [syncFrequencies, setSyncFrequencies] = useState<SyncFrequency[]>([]);
  const [conflictStrategies, setConflictStrategies] = useState<ConflictStrategy[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!token) return;
    const [cfg] = await Promise.all([
      configService.get(workspaceId),
      fetchDevices(token, workspaceId),
      fetchConflicts(token, workspaceId),
      fetchOperations(token, workspaceId),
    ]);
    setSyncFrequencies(cfg.sync_frequencies ?? []);
    setConflictStrategies(cfg.conflict_strategies ?? []);
    if ((cfg.sync_frequencies ?? []).length > 0) setFrequency(cfg.sync_frequencies[0].value);
    if ((cfg.conflict_strategies ?? []).length > 0) setConflictStrategy(cfg.conflict_strategies[0].value);
  }, [token, workspaceId, fetchDevices, fetchConflicts, fetchOperations]);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const handleSave = async () => {
    if (!tokens?.access_token) return;
    setSaving(true);
    try {
      await settingsService.update(workspaceId, "sync", {
        auto_sync: autoSync,
        frequency,
        conflict_strategy: conflictStrategy,
        offline_mode: offlineMode,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Settings save failed silently
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    if (!token || isSyncing) return;
    await loadAll();
    if (offlineMode) {
      await processOfflineQueue(token, workspaceId);
    }
  };

  const handleResetSyncData = () => {
    setAutoSync(true);
    setFrequency("realtime");
    setConflictStrategy("local_wins");
    setOfflineMode(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border-border bg-card neo-depth-zinc p-6">
            <Skeleton width="40%" height={20} className="mb-4" />
            <Skeleton lines={3} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="rounded-xl border-border bg-card neo-depth-zinc p-6">
        <h2 className="text-lg font-semibold text-foreground">Sync Status</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border-border bg-card p-4">
            <div className="flex items-center gap-2">
              {status === "offline" ? (
                <WifiOff className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Wifi className="h-3.5 w-3.5 text-green-400" />
              )}
              <span className="text-xs text-muted">Status</span>
            </div>
            <p className={cn("mt-2 text-sm font-semibold", status === "offline" ? "text-red-400" : "text-green-400")}>
              {status === "syncing" ? "Syncing..." : status === "offline" ? "Offline" : status === "conflict" ? "Conflict" : "Connected"}
            </p>
          </div>
          <div className="rounded-lg border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted" />
              <span className="text-xs text-muted">Last Sync</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "Never"}
            </p>
          </div>
          <div className="rounded-lg border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-muted" />
              <span className="text-xs text-muted">Pending</span>
            </div>
            <p className={cn("mt-2 text-sm font-semibold", offlineQueue.length > 0 ? "text-amber-400" : "text-foreground")}>
              {offlineQueue.length} ops
            </p>
          </div>
        </div>
      </div>

      {/* Auto-sync & Frequency */}
      <div className="rounded-xl border-border bg-card neo-depth-zinc p-6">
        <h2 className="text-lg font-semibold text-foreground">Sync Behavior</h2>
        <div className="mt-6 space-y-5">
          <Switch
            label="Auto-sync"
            description="Automatically sync changes in the background"
            checked={autoSync}
            onCheckedChange={setAutoSync}
          />
          <div>
            <label htmlFor="sync-frequency" className="block text-sm font-medium text-muted mb-1.5">
              Sync Frequency
            </label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="sync-frequency" disabled={!autoSync}>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {syncFrequencies.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Conflict Resolution */}
      <div className="rounded-xl border-border bg-card neo-depth-zinc p-6">
        <h2 className="text-lg font-semibold text-foreground">Conflict Resolution</h2>
        <p className="mt-1 text-sm text-muted">Choose how conflicts are resolved between devices</p>
        <div className="mt-4 space-y-2">
          {conflictStrategies.map((strategy) => (
            <button
              key={strategy.value}
              onClick={() => setConflictStrategy(strategy.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                conflictStrategy === strategy.value
                  ? "border-white/20 bg-white/5"
                  : "border-border card-hover"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  conflictStrategy === strategy.value ? "border-white" : "border-border"
                )}
              >
                {conflictStrategy === strategy.value && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{strategy.label}</p>
                <p className="text-xs text-muted">{strategy.description}</p>
              </div>
            </button>
          ))}
        </div>
        {conflicts.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {conflicts.length} unresolved conflict{conflicts.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Offline Mode */}
      <div className="rounded-xl border-border bg-card neo-depth-zinc p-6">
        <h2 className="text-lg font-semibold text-foreground">Offline Mode</h2>
        <div className="mt-4">
          <Switch
            label="Queue changes when offline"
            description="Changes made offline will sync automatically when reconnected"
            checked={offlineMode}
            onCheckedChange={setOfflineMode}
          />
        </div>
      </div>

      {/* Connected Devices */}
      <div className="rounded-xl border-border bg-card neo-depth-zinc p-6">
        <h2 className="text-lg font-semibold text-foreground">Connected Devices</h2>
        <p className="mt-1 text-sm text-muted">Devices currently synced with this workspace</p>
        {devices.length === 0 ? (
          <div className="mt-4 py-6 text-center">
            <Monitor className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-2 text-xs text-muted">No devices connected</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {devices.map((device) => {
              const DeviceIcon = DEVICE_ICONS[device.type] || Monitor;
              return (
                <div key={device.id} className="flex items-center justify-between rounded-lg border-border p-3">
                  <div className="flex items-center gap-3">
                    <DeviceIcon className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{device.name}</p>
                      <p className="text-xs text-muted">
                        {device.lastSyncAt ? `Last sync ${new Date(device.lastSyncAt).toLocaleString()}` : "Never synced"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      device.status === "synced"
                        ? "bg-green-500/10 text-green-400"
                        : device.status === "syncing"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-surface-2 text-muted"
                    )}
                  >
                    {device.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} loading={saving}>
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "Saved!" : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={handleManualSync} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync Now
        </Button>
        <Button variant="ghost" onClick={handleResetSyncData}>
          <Trash2 className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
