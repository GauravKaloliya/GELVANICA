import { API_BASE } from "../config/constants";
import type { ImportResult } from "../types/backup";
import { useAuthStore } from "@/stores/authStore";

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().tokens?.access_token;
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const backupService = {
  exportJson: (workspaceId: string) =>
    request("/backups/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId }),
    }),

  exportMarkdown: (workspaceId: string, entityIds?: string[]) =>
    request("/backups/export-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, entity_ids: entityIds }),
    }),

  exportZip: (workspaceId: string) =>
    request("/backups/export-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId }),
    }),

  exportHtml: (entityId: string) =>
    request("/backups/export-html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entityId }),
    }),

  exportPdf: (entityId: string) =>
    request("/backups/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entityId }),
    }),

  importBackup: (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("workspace_id", workspaceId);
    return request<{ data: ImportResult }>("/backups/import", {
      method: "POST",
      body: formData,
    });
  },
};
