"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWorkspaceContext } from "@/lib/workspace-context";
import { usePermissions } from "@/hooks/usePermissions";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Settings, Save, Loader2, Check } from "lucide-react";

interface WorkspaceGeneralProps {
  workspaceId: string;
}

export function WorkspaceGeneral({ workspaceId }: WorkspaceGeneralProps) {
  const { tokens } = useAuthStore();
  const { currentWorkspace, updateWorkspace } = useWorkspaceStore();
  const { canManageSettings } = usePermissions();
  const { setWorkspaceAccentColor } = useWorkspaceContext();

  const [name, setName] = useState(currentWorkspace?.name || "");
  const [description, setDescription] = useState(currentWorkspace?.description || "");
  const [accentColor, setAccentColor] = useState(
    (currentWorkspace?.settings as Record<string, unknown>)?.accent_color as string || "#6366f1"
  );
  const [slug, setSlug] = useState(
    currentWorkspace?.name?.toLowerCase().replace(/\s+/g, "-") || ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!tokens?.access_token || !workspaceId) return;
    setSaving(true);
    try {
      await updateWorkspace(tokens.access_token, workspaceId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      await apiClient.put("/settings/general", {
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        accent_color: accentColor,
        slug: slug.trim() || undefined,
      });
      setSaved(true);
      setWorkspaceAccentColor(accentColor);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }, [tokens, workspaceId, name, description, accentColor, slug, updateWorkspace, setWorkspaceAccentColor]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
        <Settings className="h-5 w-5 text-zinc-400" />
        General
      </h2>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="workspace-name" className="block text-sm font-medium text-zinc-400 mb-1.5">Name</label>
          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canManageSettings}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="workspace-description" className="block text-sm font-medium text-zinc-400 mb-1.5">Description</label>
          <textarea
            id="workspace-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canManageSettings}
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
            placeholder="Optional description"
          />
        </div>
        <div>
          <label htmlFor="workspace-deployment-mode" className="block text-sm font-medium text-zinc-400 mb-1.5">Deployment Mode</label>
          <div id="workspace-deployment-mode" className="rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2 text-sm text-zinc-300">
            {currentWorkspace?.deployment_mode || "cloud"}
          </div>
        </div>
        <div>
          <label htmlFor="workspace-slug" className="block text-sm font-medium text-zinc-400 mb-1.5">Slug</label>
          <input
            id="workspace-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!canManageSettings}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white font-mono placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
            placeholder="workspace-slug"
          />
        </div>
        <div>
          <label htmlFor="workspace-accent-color" className="block text-sm font-medium text-zinc-400 mb-1.5">Accent Color</label>
          <div className="flex items-center gap-3">
            <input
              id="workspace-accent-color"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              disabled={!canManageSettings}
              className="h-8 w-8 rounded border border-zinc-700 bg-transparent cursor-pointer disabled:opacity-50"
            />
            <input
              id="workspace-accent-color-hex"
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              disabled={!canManageSettings}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white font-mono focus:border-zinc-500 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {canManageSettings && (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
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
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
