import { get, getList, post, patch, del } from './client'
import type {
  Comment,
  CommentCreateRequest,
  CommentUpdateRequest,
} from '@shared/types'

export const commentsApi = {
  list: (params?: { workspace_id?: string; entity_id?: string; block_id?: string }) =>
    getList<Comment>('/comments/', params ? { params } : undefined),
  create: (data: CommentCreateRequest) => post<Comment>('/comments/', data),
  get: (id: string) => get<Comment>(`/comments/${id}`),
  update: (id: string, data: CommentUpdateRequest) => patch<Comment>(`/comments/${id}`, data),
  delete: (id: string) => del(`/comments/${id}`),
}
