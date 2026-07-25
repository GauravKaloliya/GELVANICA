import { get, getList, post } from './client'
import type {
  SyncOperation,
  SyncDiffRequest,
  SyncDiffResponse,
} from '@shared/types'

export const syncApi = {
  list: (params?: { workspace_id?: string }) =>
    getList<SyncOperation>('/sync/', params ? { params } : undefined),
  get: (id: string) => get<SyncOperation>(`/sync/${id}`),
  diff: (data: SyncDiffRequest) => post<SyncDiffResponse>('/sync/diff', data),
  ack: (opId: string) => post(`/sync/${opId}/ack`),
  applyDiff: (data: { workspace_id: string; diff: SyncDiffResponse }) => post('/sync/apply-diff', data),
  syncFromExport: (data: { workspace_id: string; export_data: SyncDiffResponse }) => post('/sync/sync-from-export', data),
  resolveConflict: (data: { workspace_id: string; conflict_id: string; resolution: string }) => post('/sync/resolve-conflict', data),
  ingest: (data: { workspace_id: string; operation_type: string; entity_id?: string }) =>
    post<{ id: string }>('/sync/', data),
}
