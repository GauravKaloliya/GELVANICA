import { get, getList, post, patch, del } from './client'
import type {
  Tag,
  TagCreateRequest,
  TagUpdateRequest,
} from '@shared/types'

export const tagsApi = {
  list: (params?: { workspace_id?: string }) =>
    getList<Tag>('/tags/', params ? { params } : undefined),
  create: (data: TagCreateRequest) => post<Tag>('/tags/', data),
  get: (id: string) => get<Tag>(`/tags/${id}`),
  update: (id: string, data: TagUpdateRequest) => patch<Tag>(`/tags/${id}`, data),
  delete: (id: string) => del(`/tags/${id}`),
  attach: (tagId: string, entityId: string) =>
    post<{ tag_id: string; entity_id: string; created_at: string }>(`/tags/${tagId}/entities/${entityId}`),
  detach: (tagId: string, entityId: string) => del(`/tags/${tagId}/entities/${entityId}`),
}
