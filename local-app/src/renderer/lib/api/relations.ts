import { get, getList, post, del } from './client'
import type {
  Relation,
  RelationCreateRequest,
} from '@shared/types'

export const relationsApi = {
  list: (params?: { workspace_id?: string }) =>
    getList<Relation>('/relations/', params ? { params } : undefined),
  create: (data: RelationCreateRequest) => post<Relation>('/relations/', data),
  get: (id: string) => get<Relation>(`/relations/${id}`),
  delete: (id: string) => del(`/relations/${id}`),
  outgoing: (entityId: string) => getList<Relation>(`/relations/entity/${entityId}`),
  backlinks: (entityId: string) => getList<Relation>(`/relations/backlinks/${entityId}`),
  neighbors: (entityId: string) => get(`/relations/neighbors/${entityId}`),
  path: (params: { source_entity_id: string; target_entity_id: string }) =>
    get('/relations/path', { params }),
}
