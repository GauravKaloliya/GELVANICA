import { getList, post, del, client } from './client'
import type {
  BackupExport,
  BackupExportRequest,
  BackupImportRequest,
  BackupImportResponse,
  BackupToDiskResponse,
} from '@shared/types'

export const backupsApi = {
  list: (params?: { workspace_id?: string }) =>
    getList('/backups/', params ? { params } : undefined),
  export: (data: BackupExportRequest) => post<BackupExport>('/backups/export', data),
  exportToDisk: (data: BackupExportRequest) => post<BackupToDiskResponse>('/backups/export-to-disk', data),
  import: (data: BackupImportRequest) => post<BackupImportResponse>('/backups/import', data),
  delete: (backupId: string) => del(`/backups/${backupId}`),
  exportMarkdown: (workspaceId: string) =>
    post('/backups/export-markdown', { workspace_id: workspaceId }),
  exportZip: (workspaceId: string) =>
    post('/backups/export-zip', { workspace_id: workspaceId }),
  exportHtml: (workspaceId: string) =>
    post('/backups/export-html', { workspace_id: workspaceId }),
  exportPdf: (workspaceId: string) =>
    post('/backups/export-pdf', { workspace_id: workspaceId }),
  exportZipEncrypted: async (workspaceId: string): Promise<Blob> => {
    const response = await client.post(
      '/backups/export-zip-encrypted',
      { workspace_id: workspaceId },
      { responseType: 'blob' },
    )
    return response.data
  },
  importZip: async (workspaceId: string, file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspace_id', workspaceId)
    const response = await client.post('/backups/import-zip', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
