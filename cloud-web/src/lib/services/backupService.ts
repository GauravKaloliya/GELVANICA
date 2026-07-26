import { apiClient, rawRequestBlob } from "../apiClient";
import type { ImportResult } from "../types/backup";

export const backupService = {
  list: (workspaceId: string) =>
    apiClient.get<{data: unknown[]}>(`/workspaces/${workspaceId}/backups`),

  exportJson: (workspaceId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/backups/export`),

  create: (workspaceId: string) =>
    apiClient.post<{ data: { id: string } }>(`/workspaces/${workspaceId}/backups/create`),

  restore: (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData(`/workspaces/${workspaceId}/backups/${file.name}/restore`, formData);
  },

  exportToDisk: (workspaceId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/backups/export-to-disk`),

  importBackup: (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData<{data: ImportResult}>(`/workspaces/${workspaceId}/backups/import`, formData);
  },

  exportMarkdown: (workspaceId: string, entityIds?: string[]) =>
    apiClient.post(`/workspaces/${workspaceId}/backups/export-markdown`, { entity_ids: entityIds }),

  exportZip: (workspaceId: string) =>
    rawRequestBlob(`/workspaces/${workspaceId}/backups/export-zip`, { method: "POST" }),

  exportHtml: (workspaceId: string, entityId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/backups/export-html`, { entity_id: entityId }),

  exportPdf: (workspaceId: string, entityId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/backups/export-pdf`, { entity_id: entityId }),

  exportZipEncrypted: (workspaceId: string) =>
    rawRequestBlob(`/workspaces/${workspaceId}/backups/export-zip-encrypted`, { method: "POST" }),

  importZip: (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData(`/workspaces/${workspaceId}/backups/import-zip`, formData);
  },

  download: (workspaceId: string, filename: string) =>
    rawRequestBlob(`/workspaces/${workspaceId}/backups/download-zip/${encodeURIComponent(filename)}`, { method: "GET" }),
};
