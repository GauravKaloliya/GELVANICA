"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
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

  const [notifPrefs, setNotifPrefs] = useState({
    entity_updates: true,
    mentions: true,
    governance_alerts: true,
    sync_conflicts: true,
  });
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
        const data = await settingsService.get(workspaceId, "notifications");
        setNotifPrefs({
          entity_updates: Boolean(data.entity_updates ?? true),
          mentions: Boolean(data.mentions ?? true),
          governance_alerts: Boolean(data.governance_alerts ?? true),
          sync_conflicts: Boolean(data.sync_conflicts ?? true),
        });
      } catch { /* ignore */ } finally {
        setLoadingNotifs(false);
      }
    }
    fetchNotifs();
  }, [tokens, workspaceId]);

  const saveNotifPrefs = useCallback(
    (prefs: typeof notifPrefs) => {
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
    (key: keyof typeof notifPrefs) => {
      setNotifPrefs((prev) => {
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
      await apiClient.post("/settings/reset", { workspace_id: workspaceId }, tokens.access_token);
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
    <div className="mx-auto max-w-2xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Workspace Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your workspace configuration</p>
      </div>

      <WorkspaceGeneral workspaceId={workspaceId} />

      {/* Notification Settings */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Bell className="h-5 w-5 text-zinc-400" />
          Notifications
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Configure notification preferences</p>
        <div className="mt-4 space-y-3">
          {([
            ["entity_updates", "Entity Updates", "When entities you follow are updated"],
            ["mentions", "Mentions", "When someone mentions you in a comment"],
            ["governance_alerts", "Governance Alerts", "Health score changes and compliance issues"],
            ["sync_conflicts", "Sync Conflicts", "When sync conflicts need resolution"],
          ] as const).map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
              <Switch
                checked={notifPrefs[key]}
                onCheckedChange={() => toggleNotifPref(key)}
                disabled={loadingNotifs}
              />
            </div>
          ))}
        </div>
        {savingNotifs && (
          <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </p>
        )}
      </div>

      {/* Data Management */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Data Management</h2>
        <p className="mt-1 text-sm text-zinc-500">Export, import, or delete workspace data</p>
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setShowExport(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 p-3 text-left transition-colors hover:border-zinc-700"
          >
            <Download className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-white">Export Workspace</p>
              <p className="text-xs text-zinc-500">Download all data as JSON or Markdown</p>
            </div>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 p-3 text-left transition-colors hover:border-zinc-700"
          >
            <Upload className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-white">Import Data</p>
              <p className="text-xs text-zinc-500">Import data from a JSON backup</p>
            </div>
          </button>
        </div>
      </div>

      {/* Backups */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Database className="h-5 w-5 text-zinc-400" />
          Backups
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Create and restore workspace backups</p>
        <div className="mt-4">
          <BackupPanel workspaceId={workspaceId} />
        </div>
      </div>

      {/* Reset to Defaults */}
      {canManageSettings && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Reset Settings</h2>
          <p className="mt-1 text-sm text-zinc-500">Reset all settings to their default values</p>
          <button
            onClick={handleResetDefaults}
            disabled={resetting}
            className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-50"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reset to Defaults
          </button>
        </div>
      )}

      {/* Danger Zone */}
      {canDeleteWorkspace && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-400">
            <AlertCircle className="h-5 w-5" />
            Danger Zone
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
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
