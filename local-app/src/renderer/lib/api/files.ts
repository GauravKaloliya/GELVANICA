import { get, getList, post, del, upload } from './client'
import type {
  GnoviumFile,
  FileUploadResponse,
  FileCreateRequest,
  FileLinkRequest,
  FileVariant,
  CleanupOrphansRequest,
  CleanupOrphansResponse,
} from '@shared/types'

export interface StorageInfo {
  used_bytes: number
  file_count: number
  quota_bytes: number | null
  quota_used_percent: number | null
  storage_provider: string
  tier_stats: Record<string, unknown> | null
}

export const filesApi = {
  list: (params?: { workspace_id?: string }) =>
    getList<GnoviumFile>('/files/', params ? { params } : undefined),
  upload: (formData: FormData) => upload<FileUploadResponse>('/files/upload', formData),
  create: (data: FileCreateRequest) => post<GnoviumFile>('/files/', data),
  get: (id: string) => get<GnoviumFile>(`/files/${id}`),
  delete: (id: string) => del(`/files/${id}`),
  download: (id: string) => get<Blob>(`/files/${id}/download`),
  link: (fileId: string, entityId: string, data?: FileLinkRequest) =>
    post(`/files/${fileId}/entities/${entityId}`, data),
  unlink: (fileId: string, entityId: string) =>
    del(`/files/${fileId}/entities/${entityId}`),
  thumbnail: (id: string) => get<Blob>(`/files/${id}/thumbnail`),
  preview: (id: string) => get<Blob>(`/files/${id}/preview`),
  variants: (id: string) => getList<FileVariant>(`/files/${id}/variants`),
  variant: (id: string, type: string) => get<FileVariant>(`/files/${id}/variants/${type}`),
  storageInfo: () => get<StorageInfo>('/files/storage-info'),
  cleanupOrphans: (data?: CleanupOrphansRequest) =>
    post<CleanupOrphansResponse>('/files/cleanup-orphans', data),
}
