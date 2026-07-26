"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { settingsService } from "@/lib/services/settingsService";
import { configService } from "@/lib/services/configService";
import type { NotificationPref } from "@/lib/services/configService";
import { Switch } from "@/components/ui/Switch";
import { ArrowLeft, Save, Loader2, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

interface LocalPrefs {
  email_notifications: boolean;
  push_notifications: boolean;
  mention_notifications: boolean;
  comment_notifications: boolean;
  update_notifications: boolean;
  governance_notifications: boolean;
  sync_notifications: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export default function NotificationSettingsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [prefs, setPrefs] = useState<LocalPrefs | null>(null);
  const [prefItems, setPrefItems] = useState<NotificationPref[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPrefs = useCallback(async () => {
    try {
      const [res, cfg] = await Promise.all([
        settingsService.get(workspaceId, "notifications"),
        configService.get(workspaceId),
      ]);
      setPrefItems(cfg.notification_prefs ?? []);
      const p = res.data as Record<string, unknown>;
      setPrefs({
        email_notifications: (p.email_notifications as boolean) ?? false,
        push_notifications: (p.push_notifications as boolean) ?? false,
        mention_notifications: (p.mention_notifications as boolean) ?? false,
        comment_notifications: (p.comment_notifications as boolean) ?? false,
        update_notifications: (p.update_notifications as boolean) ?? false,
        governance_notifications: (p.governance_notifications as boolean) ?? false,
        sync_notifications: (p.sync_notifications as boolean) ?? false,
        quiet_hours_start: (p.quiet_hours_start as string | null) ?? null,
        quiet_hours_end: (p.quiet_hours_end as string | null) ?? null,
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await settingsService.update(workspaceId, "notifications", prefs as unknown as Record<string, unknown>);
      setSaved(true);
      toast.success("Notification preferences saved");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-56" />
        <div className="rounded-xl border border-border bg-card p-6 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg p-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton variant="rectangular" className="h-6 w-10 rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton variant="rectangular" className="h-10 w-36 rounded-lg" />
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link
          href={`/workspace/${workspaceId}/settings`}
          className="hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link
          href={`/workspace/${workspaceId}/settings`}
          className="hover:text-foreground"
        >
          Settings
        </Link>
        <span>/</span>
        <span className="text-foreground">Notifications</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground display-heading">
          Notification Preferences
        </h1>
        <p className="mt-1 text-step-3 text-muted">
          Choose which notifications you want to receive
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-1">
        {prefItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg p-3 hover:bg-surface/30"
          >
            <Switch
              label={item.label}
              description={item.description}
              checked={prefs ? (prefs as Record<string, boolean>)[item.key] ?? false : false}
              onCheckedChange={(checked) =>
                setPrefs((p) => p ? { ...p, [item.key]: checked } : p)
              }
            />
          </div>
        ))}
      </div>

      {/* Quiet Hours */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold text-foreground display-heading">Quiet Hours</h2>
        </div>
        <p className="text-step-1 text-muted">Pause notifications during specific hours</p>
        <div className="flex items-center gap-4">
          <div className="space-y-1.5">
            <label htmlFor="quiet-start" className="text-step-1 text-muted">Start</label>
            <input
              id="quiet-start"
              type="time"
              value={prefs?.quiet_hours_start || ""}
              onChange={(e) => setPrefs((p) => p ? { ...p, quiet_hours_start: e.target.value || null } : p)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <span className="text-muted mt-5">to</span>
          <div className="space-y-1.5">
            <label htmlFor="quiet-end" className="text-step-1 text-muted">End</label>
            <input
              id="quiet-end"
              type="time"
              value={prefs?.quiet_hours_end || ""}
              onChange={(e) => setPrefs((p) => p ? { ...p, quiet_hours_end: e.target.value || null } : p)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
          saved
            ? "bg-green-600 text-foreground"
            : "bg-card text-foreground hover:bg-surface"
        )}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saved ? "Saved!" : "Save Preferences"}
      </button>
    </div>
  );
}
