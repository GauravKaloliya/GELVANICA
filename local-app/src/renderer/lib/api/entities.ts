import { get, getList, post, patch, del } from './client'
import type {
  Entity,
  EntityCreateRequest,
  EntityUpdateRequest,
  EntityType,
  EntityTypeCreateRequest,
  EntityProperty,
  PropertyCreateRequest,
  PaginationParams,
} from '@shared/types'

export const entitiesApi = {
  list: (params?: { workspace_id?: string } & PaginationParams) =>
    getList<Entity>('/entities/', params ? { params } : undefined),
  create: (data: EntityCreateRequest) => post<Entity>('/entities/', data),
  get: (id: string) => get<Entity>(`/entities/${id}`),
  update: (id: string, data: EntityUpdateRequest) => patch<Entity>(`/entities/${id}`, data),
  delete: (id: string) => del(`/entities/${id}`),
  restore: (id: string) => post<Entity>(`/entities/${id}/restore`),
  archive: (id: string) => post<Entity>(`/entities/${id}/archive`),
  duplicate: (id: string) => post<Entity>(`/entities/${id}/duplicate`),
  children: (id: string, params?: PaginationParams) =>
    getList<Entity>(`/entities/${id}/children`, params ? { params } : undefined),
  createChild: (id: string, data: EntityCreateRequest) => post<Entity>(`/entities/${id}/children`, data),
  versions: (entityId: string, params?: Record<string, unknown>) =>
    get<Array<{ id: string; entity_id: string; changeset_id: string; snapshot: Record<string, unknown> | null; created_at: string }>>(`/entities/${entityId}/versions`, params ? { params } : undefined),
  types: {
    list: (params?: { workspace_id?: string }) =>
      getList<EntityType>('/entities/types', params ? { params } : undefined),
    create: (data: EntityTypeCreateRequest) => post<EntityType>('/entities/types', data),
  },
  properties: {
    list: (params?: { workspace_id?: string }) =>
      getList<EntityProperty>('/entities/properties', params ? { params } : undefined),
    create: (data: PropertyCreateRequest) => post<EntityProperty>('/entities/properties', data),
  },
}
