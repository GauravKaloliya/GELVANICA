"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { configService } from "@/lib/services/configService";
import type { NotificationPref } from "@/lib/services/configService";
import { ExportModal, ImportModal, ConfirmDialog } from "@/components/modals";
import { BackupPanel } from "@/components/settings/BackupPanel";
import { WorkspaceGeneral } from "@/components/settings/WorkspaceGeneral";
import { Switch } from "@/components/ui/Switch";
import {
  Trash2,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  RefreshCw,
  Database,
  Bell,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { usePermissions } from "@/hooks/usePermissions";
import { settingsService } from "@/lib/services/settingsService";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { tokens } = useAuthStore();
  const { currentWorkspace, deleteWorkspace } = useWorkspaceStore();
  const { canManageSettings, canDeleteWorkspace } = usePermissions();

  const workspaceId = params.id as string;
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean> | null>(null);
  const [notifItems, setNotifItems] = useState<NotificationPref[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const notifSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (notifSaveTimerRef.current) clearTimeout(notifSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    async function fetchNotifs() {
      if (!tokens?.access_token) return;
      setLoadingNotifs(true);
      try {
        const [data, cfg] = await Promise.all([
          settingsService.get(workspaceId, "notifications"),
          configService.get(workspaceId),
        ]);
        setNotifItems((cfg.notification_prefs ?? []).filter(n => ["entity_updates", "mentions", "governance_alerts", "sync_conflicts"].includes(n.key)));
        setNotifPrefs({
          entity_updates: Boolean(data.entity_updates ?? false),
          mentions: Boolean(data.mentions ?? false),
          governance_alerts: Boolean(data.governance_alerts ?? false),
          sync_conflicts: Boolean(data.sync_conflicts ?? false),
        });
      } catch { /* ignore */ } finally {
        setLoadingNotifs(false);
      }
    }
    fetchNotifs();
  }, [tokens, workspaceId]);

  const saveNotifPrefs = useCallback(
    (prefs: Record<string, boolean>) => {
      if (!tokens?.access_token || !workspaceId) return;
      if (notifSaveTimerRef.current) clearTimeout(notifSaveTimerRef.current);
      notifSaveTimerRef.current = setTimeout(async () => {
        setSavingNotifs(true);
        try {
          await settingsService.update(workspaceId, "notifications", prefs);
        } catch { /* ignore */ } finally {
          setSavingNotifs(false);
        }
      }, 500);
    },
    [tokens, workspaceId]
  );

  const toggleNotifPref = useCallback(
    (key: string) => {
      setNotifPrefs((prev) => {
        if (!prev) return prev;
        const next = { ...prev, [key]: !prev[key] };
        saveNotifPrefs(next);
        return next;
      });
    },
    [saveNotifPrefs]
  );

  const handleResetDefaults = useCallback(async () => {
    if (!tokens?.access_token || !workspaceId) return;
    setResetting(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/settings/reset`, undefined, tokens.access_token);
    } catch { /* handle error */ } finally {
      setResetting(false);
    }
  }, [tokens, workspaceId]);

  const handleDelete = useCallback(async () => {
    if (!tokens?.access_token || deleteConfirmText !== currentWorkspace?.name) return;
    setDeleting(true);
    try {
      await deleteWorkspace(tokens.access_token, workspaceId);
      router.push("/workspaces");
    } catch {
      setDeleting(false);
    }
  }, [tokens, deleteConfirmText, currentWorkspace?.name, workspaceId, deleteWorkspace, router]);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground display-heading">Workspace Settings</h1>
        <p className="mt-1 text-step-3 text-muted">Manage your workspace configuration</p>
      </div>

      <WorkspaceGeneral workspaceId={workspaceId} />

      {/* Notification Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground display-heading">
          <Bell className="h-5 w-5 text-muted" />
          Notifications
        </h2>
        <p className="mt-1 text-step-3 text-muted">Configure notification preferences</p>
        <div className="mt-4 space-y-3">
          {notifItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-step-3 font-medium text-foreground">{item.label}</p>
                <p className="text-step-1 text-muted">{item.description}</p>
              </div>
              <Switch
                checked={notifPrefs?.[item.key] ?? false}
                onCheckedChange={() => toggleNotifPref(item.key)}
                disabled={loadingNotifs}
              />
            </div>
          ))}
        </div>
        {savingNotifs && (
          <p className="mt-2 text-step-1 text-muted flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </p>
        )}
      </div>

      {/* Data Management */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground display-heading">Data Management</h2>
        <p className="mt-1 text-step-3 text-muted">Export, import, or delete workspace data</p>
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setShowExport(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-border"
          >
            <Download className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-step-3 font-medium text-foreground">Export Workspace</p>
              <p className="text-step-1 text-muted">Download all data as JSON or Markdown</p>
            </div>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-border"
          >
            <Upload className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-step-3 font-medium text-foreground">Import Data</p>
              <p className="text-step-1 text-muted">Import data from a JSON backup</p>
            </div>
          </button>
        </div>
      </div>

      {/* Backups */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground display-heading">
          <Database className="h-5 w-5 text-muted" />
          Backups
        </h2>
        <p className="mt-1 text-step-3 text-muted">Create and restore workspace backups</p>
        <div className="mt-4">
          <BackupPanel workspaceId={workspaceId} />
        </div>
      </div>

      {/* Reset to Defaults */}
      {canManageSettings && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground display-heading">Reset Settings</h2>
          <p className="mt-1 text-step-3 text-muted">Reset all settings to their default values</p>
          <button
            onClick={handleResetDefaults}
            disabled={resetting}
            className="mt-4 flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reset to Defaults
          </button>
        </div>
      )}

      {/* Danger Zone */}
      {canDeleteWorkspace && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-400 display-heading">
            <AlertCircle className="h-5 w-5" />
            Danger Zone
          </h2>
          <p className="mt-1 text-step-3 text-muted">
            Permanently delete this workspace and all its data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete Workspace
          </button>
        </div>
      )}

      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        workspaceId={workspaceId}
        workspaceName={currentWorkspace?.name || "Workspace"}
      />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} workspaceId={workspaceId} />
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
        onConfirm={handleDelete}
        title="Delete Workspace"
        description={`Type "${currentWorkspace?.name}" to confirm deletion. This will permanently remove all entities, blocks, relations, and files.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
