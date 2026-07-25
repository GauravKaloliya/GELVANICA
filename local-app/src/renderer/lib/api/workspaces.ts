import { get, getList, post, patch, del } from './client'
import type {
  Workspace,
  WorkspaceCreateRequest,
  WorkspaceUpdateRequest,
  WorkspaceStats,
  PaginationParams,
} from '@shared/types'

export const workspacesApi = {
  list: (params?: PaginationParams) =>
    getList<Workspace>('/workspaces/', params ? { params } : undefined),
  create: (data: WorkspaceCreateRequest) => post<Workspace>('/workspaces/', data),
  get: (id: string) => get<Workspace>(`/workspaces/${id}`),
  update: (id: string, data: WorkspaceUpdateRequest) => patch<Workspace>(`/workspaces/${id}`, data),
  delete: (id: string) => del(`/workspaces/${id}`),
  stats: (id: string) => get<WorkspaceStats>(`/workspaces/${id}/stats`),
}
