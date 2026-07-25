"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { notificationService } from "@/lib/services/notifications";
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

const DEFAULT_PREFS: LocalPrefs = {
  email_notifications: true,
  push_notifications: true,
  mention_notifications: true,
  comment_notifications: true,
  update_notifications: true,
  governance_notifications: true,
  sync_notifications: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

const PREF_ITEMS: Array<{
  key: keyof Omit<LocalPrefs, "quiet_hours_start" | "quiet_hours_end">;
  label: string;
  description: string;
}> = [
  {
    key: "email_notifications",
    label: "Email Notifications",
    description: "Receive notifications via email",
  },
  {
    key: "push_notifications",
    label: "Push Notifications",
    description: "Browser push notifications",
  },
  {
    key: "mention_notifications",
    label: "Mentions",
    description: "When someone @mentions you in a comment",
  },
  {
    key: "comment_notifications",
    label: "Comments",
    description: "New comments on entities you own or follow",
  },
  {
    key: "update_notifications",
    label: "Entity Updates",
    description: "When entities you follow are created, updated, or deleted",
  },
  {
    key: "governance_notifications",
    label: "Governance Alerts",
    description: "Health score changes and compliance issues",
  },
  {
    key: "sync_notifications",
    label: "Sync Conflicts",
    description: "When sync conflicts need your resolution",
  },
];

export default function NotificationSettingsPage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;
  const [prefs, setPrefs] = useState<LocalPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPrefs = useCallback(async () => {
    if (!tokens?.access_token) return;
    try {
      const data = await notificationService.getPreferences(tokens.access_token, workspaceId);
      setPrefs({
        email_notifications: data.email_notifications ?? true,
        push_notifications: data.push_notifications ?? true,
        mention_notifications: data.mention_notifications ?? true,
        comment_notifications: data.comment_notifications ?? true,
        update_notifications: data.update_notifications ?? true,
        governance_notifications: data.governance_notifications ?? true,
        sync_notifications: data.sync_notifications ?? true,
        quiet_hours_start: data.quiet_hours_start ?? null,
        quiet_hours_end: data.quiet_hours_end ?? null,
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [tokens, workspaceId]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleSave = async () => {
    if (!tokens?.access_token) return;
    setSaving(true);
    try {
      await notificationService.updatePreferences(tokens.access_token, workspaceId, prefs);
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
      <div className="mx-auto max-w-2xl p-6 space-y-8">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-56" />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-1">
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
    <div className="mx-auto max-w-2xl p-6 space-y-8">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href={`/workspace/${workspaceId}/settings`}
          className="hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link
          href={`/workspace/${workspaceId}/settings`}
          className="hover:text-white"
        >
          Settings
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Notifications</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">
          Notification Preferences
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Choose which notifications you want to receive
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-1">
        {PREF_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg p-3 hover:bg-zinc-800/30"
          >
            <Switch
              label={item.label}
              description={item.description}
              checked={prefs[item.key]}
              onCheckedChange={(checked) =>
                setPrefs((p) => ({ ...p, [item.key]: checked }))
              }
            />
          </div>
        ))}
      </div>

      {/* Quiet Hours */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Quiet Hours</h2>
        </div>
        <p className="text-xs text-zinc-500">Pause notifications during specific hours</p>
        <div className="flex items-center gap-4">
          <div className="space-y-1.5">
            <label htmlFor="quiet-start" className="text-xs text-zinc-400">Start</label>
            <input
              id="quiet-start"
              type="time"
              value={prefs.quiet_hours_start || ""}
              onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_start: e.target.value || null }))}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <span className="text-zinc-600 mt-5">to</span>
          <div className="space-y-1.5">
            <label htmlFor="quiet-end" className="text-xs text-zinc-400">End</label>
            <input
              id="quiet-end"
              type="time"
              value={prefs.quiet_hours_end || ""}
              onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_end: e.target.value || null }))}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
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
            ? "bg-green-600 text-white"
            : "bg-white text-black hover:bg-zinc-200"
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
