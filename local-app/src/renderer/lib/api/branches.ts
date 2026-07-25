import { get, getList, post, del } from './client'
import type {
  Branch,
  BranchCreateRequest,
  MergeConflict,
  Snapshot,
  Changeset,
} from '@shared/types'

export const branchesApi = {
  list: (params?: { workspace_id?: string }) =>
    getList<Branch>('/branches/', params ? { params } : undefined),
  create: (data: BranchCreateRequest) => post<Branch>('/branches/', data),
  get: (id: string) => get<Branch>(`/branches/${id}`),
  delete: (id: string) => del(`/branches/${id}`),
  mergeInto: (id: string, targetBranchId: string) =>
    post(`/branches/${id}/merge`, { target_branch_id: targetBranchId }),
  listMergeConflicts: (params: { workspace_id: string; merge_id?: string }) =>
    get<MergeConflict[]>('/branches/merge-conflicts', { params }),
  resolveConflict: (conflictId: string, data: { resolution: 'ours' | 'theirs' | 'manual'; merged_content?: Record<string, unknown> }) =>
    post<MergeConflict>(`/branches/merge-conflicts/${conflictId}/resolve`, data),
  merge: (sourceBranchId: string, targetBranchId: string) =>
    post<{ merged: boolean; conflicts: Array<unknown> }>('/branches/merge', { source_branch_id: sourceBranchId, target_branch_id: targetBranchId }),
}

export const versionsApi = {
  changesets: {
    list: (params?: { branch_id?: string }) =>
      get<Changeset[]>('/versions/changesets', params ? { params } : undefined),
    create: (data: { branch_id: string; description?: string }) => post<Changeset>('/versions/changesets', data),
  },
  snapshots: {
    list: (params?: { branch_id?: string }) =>
      get<Snapshot[]>('/versions/snapshots', params ? { params } : undefined),
    create: (data: { branch_id: string; name?: string; description?: string }) => post<Snapshot>('/versions/snapshots', data),
    delete: (id: string) => del(`/versions/snapshots/${id}`),
  },
  entitySnapshot: (entityId: string, data: { changeset_id: string }) =>
    post(`/versions/entities/${entityId}/snapshot`, data),
  entityVersions: (entityId: string, params?: { page?: number; per_page?: number }) =>
    get(`/versions/entities/${entityId}`, params ? { params } : undefined),
  blockVersions: (blockId: string, params?: { page?: number; per_page?: number }) =>
    get(`/versions/blocks/${blockId}`, params ? { params } : undefined),
  restore: (versionId: string) => post(`/versions/restore/${versionId}`),
  compare: (leftVersionId: string, rightVersionId: string) =>
    get('/versions/compare', { params: { left_version_id: leftVersionId, right_version_id: rightVersionId } }),
}

export const diffsApi = {
  compare: (data: { left_version_id: string; right_version_id: string }) =>
    post('/diffs/compare', data),
  blocks: (data: { left_version_id: string; right_version_id: string }) =>
    post('/diffs/blocks', data),
}
