"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/apiClient";
import { configService } from "@/lib/services/configService";
import type { SyncInterval, ConflictStrategy } from "@/lib/services/configService";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Server,
} from "lucide-react";

interface SyncSettings {
  auto_sync: boolean;
  sync_interval_ms: number;
  conflict_strategy: "local_wins" | "remote_wins" | "manual";
  sync_on_connect: boolean;
  max_pending_ops: number;
}

export default function SyncSettingsPage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;
  const token = tokens?.access_token;

  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"online" | "offline" | "unknown">("unknown");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingOps, setPendingOps] = useState(0);
  const [intervalOptions, setIntervalOptions] = useState<SyncInterval[]>([]);
  const [conflictStrategies, setConflictStrategies] = useState<ConflictStrategy[]>([]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const [settingsJson, syncJson, cfg] = await Promise.all([
        apiClient.get<{ data: Partial<SyncSettings> }>(`/workspaces/${workspaceId}/settings/sync`),
        apiClient.get<{ meta?: { total?: number }; data?: Array<{ created_at: string }> }>(`/workspaces/${workspaceId}/sync?pending=true`),
        configService.get(workspaceId),
      ]);
      setIntervalOptions(cfg.sync_intervals ?? []);
      setConflictStrategies(cfg.conflict_strategies ?? []);

      if (settingsJson.data) {
        setSettings({
          auto_sync: settingsJson.data.auto_sync ?? false,
          sync_interval_ms: settingsJson.data.sync_interval_ms ?? 30000,
          conflict_strategy: settingsJson.data.conflict_strategy ?? "manual",
          sync_on_connect: settingsJson.data.sync_on_connect ?? false,
          max_pending_ops: settingsJson.data.max_pending_ops ?? 500,
        });
      }
      setPendingOps(syncJson.meta?.total || 0);
      if (syncJson.data && syncJson.data.length > 0) {
        setLastSync(syncJson.data[0].created_at);
      }
      setSyncStatus("online");
    } catch {
      setSyncStatus("offline");
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!settings?.auto_sync || !token) return;
    const interval = setInterval(async () => {
      try {
        const json = await apiClient.get<{ meta?: { total?: number } }>(`/workspaces/${workspaceId}/sync?pending=true`);
        setPendingOps(json.meta?.total || 0);
      } catch {
        setSyncStatus("offline");
      }
    }, settings.sync_interval_ms);
    return () => clearInterval(interval);
  }, [settings?.auto_sync, settings?.sync_interval_ms, token, workspaceId]);

  const handleSave = async () => {
    if (!token || !settings) return;
    setSaving(true);
    try {
      await apiClient.put(`/workspaces/${workspaceId}/settings/sync`, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof SyncSettings>(key: K, value: SyncSettings[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href={`/workspace/${workspaceId}/settings`} className="hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href={`/workspace/${workspaceId}/settings`} className="hover:text-foreground">
          Settings
        </Link>
        <span>/</span>
        <span className="text-foreground">Sync</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground display-heading">Sync Configuration</h1>
        <p className="mt-1 text-step-3 text-muted">Configure how this workspace syncs across devices</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            {syncStatus === "online" ? (
              <Wifi className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className="text-step-1 text-muted">Status</span>
          </div>
          <p className={cn("mt-2 text-sm font-semibold", syncStatus === "online" ? "text-green-400" : "text-red-400")}>
            {syncStatus === "online" ? "Connected" : "Disconnected"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted" />
            <span className="text-step-1 text-muted">Last Sync</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {lastSync ? new Date(lastSync).toLocaleTimeString() : "Never"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-muted" />
            <span className="text-step-1 text-muted">Pending</span>
          </div>
          <p className={cn("mt-2 text-sm font-semibold", pendingOps > 0 ? "text-amber-400" : "text-foreground")}>
            {pendingOps} ops
          </p>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground display-heading">Sync Behavior</h2>

        {/* Auto Sync Toggle */}
        <Switch
          label="Auto Sync"
          description="Automatically sync changes in the background"
          checked={settings.auto_sync}
          onCheckedChange={(checked) => update("auto_sync", checked)}
        />

        {/* Sync Interval */}
        <div>
          <label htmlFor="sync-interval" className="block text-sm font-medium text-foreground mb-1.5">Sync Interval</label>
          <div className="flex flex-wrap gap-2">
            {intervalOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update("sync_interval_ms", opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  settings?.sync_interval_ms === opt.value
                    ? "bg-card text-foreground"
                    : "border border-border text-muted hover:border-accent hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conflict Strategy */}
        <div>
          <label htmlFor="conflict-resolution" className="block text-sm font-medium text-foreground mb-1.5">Conflict Resolution</label>
          <div className="space-y-2">
            {conflictStrategies.map((strategy) => (
              <button
                key={strategy.value}
                onClick={() => update("conflict_strategy", strategy.value as SyncSettings["conflict_strategy"])}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  settings?.conflict_strategy === strategy.value
                    ? "border-white/20 bg-white/5"
                    : "border-border hover:border-border"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                    settings?.conflict_strategy === strategy.value
                      ? "border-white"
                      : "border-border"
                  )}
                >
                  {settings?.conflict_strategy === strategy.value && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{strategy.label}</p>
                  <p className="text-xs text-muted">{strategy.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sync on Connect */}
        <Switch
          label="Sync on Reconnect"
          description="Automatically sync when connection is restored"
          checked={settings?.sync_on_connect ?? false}
          onCheckedChange={(checked) => update("sync_on_connect", checked)}
        />

        {/* Max Pending Ops */}
        <Slider
          label={`Max Pending Operations: ${settings?.max_pending_ops ?? 500}`}
          min={50}
          max={2000}
          step={50}
          value={[settings.max_pending_ops]}
          onValueChange={(value) => update("max_pending_ops", value[0])}
        />
        <p className="mt-1 text-[11px] text-muted">
          Maximum queued operations before forcing a full sync
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
            saved ? "bg-green-600 text-foreground" : "bg-card text-foreground hover:bg-surface"
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved!" : "Save Settings"}
        </button>
        {pendingOps > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {pendingOps} operations pending sync
          </div>
        )}
      </div>
    </div>
  );
}
