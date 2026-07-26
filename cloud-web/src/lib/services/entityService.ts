import { apiClient } from "../apiClient";
import type { Entity, EntityType, PropertyType, EntityProperty } from "../types";

interface EntityListResponse {
  data: Entity[];
  meta?: { total: number };
}

interface EntityResponse {
  data: Entity;
}

interface EntityTypeResponse {
  data: EntityType[];
}

interface PropertyResponse {
  data: PropertyType[];
}

export const entityService = {
  list: (workspaceId: string, params?: { entity_type_id?: string; parent_id?: string; page?: number; per_page?: number }) => {
    const sp = new URLSearchParams();
    if (params?.entity_type_id) sp.set("entity_type_id", params.entity_type_id);
    if (params?.parent_id) sp.set("parent_id", params.parent_id);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    const qs = sp.toString();
    return apiClient.get<EntityListResponse>(`/workspaces/${workspaceId}/entities/${qs ? `?${qs}` : ""}`);
  },

  create: (workspaceId: string, data: {
    name?: string;
    entity_type_id?: string;
    parent_id?: string;
    properties?: Record<string, unknown>;
  }) => apiClient.post<EntityResponse>(`/workspaces/${workspaceId}/entities/`, data),

  get: (workspaceId: string, entityId: string) =>
    apiClient.get<{ data: { entity: Entity } }>(`/workspaces/${workspaceId}/entities/${entityId}`),

  update: (workspaceId: string, entityId: string, data: {
    name?: string;
    entity_type_id?: string;
    properties?: Record<string, unknown>;
  }) => apiClient.patch<EntityResponse>(`/workspaces/${workspaceId}/entities/${entityId}`, data),

  delete: (workspaceId: string, entityId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/entities/${entityId}`),

  permanentDelete: (workspaceId: string, entityId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/entities/${entityId}/permanent`),

  restore: (workspaceId: string, entityId: string) =>
    apiClient.post<EntityResponse>(`/workspaces/${workspaceId}/entities/${entityId}/restore`),

  archive: (workspaceId: string, entityId: string) =>
    apiClient.post<EntityResponse>(`/workspaces/${workspaceId}/entities/${entityId}/archive`),

  duplicate: (workspaceId: string, entityId: string) =>
    apiClient.post<EntityResponse>(`/workspaces/${workspaceId}/entities/${entityId}/duplicate`),

  listChildren: (workspaceId: string, entityId: string) =>
    apiClient.get<EntityListResponse>(`/workspaces/${workspaceId}/entities/${entityId}/children`),

  createChild: (workspaceId: string, entityId: string, data: {
    title?: string;
    entity_type_id?: string;
    properties?: Record<string, unknown>;
  }) => apiClient.post<EntityResponse>(`/workspaces/${workspaceId}/entities/${entityId}/children`, data),

  listVersions: (workspaceId: string, entityId: string) =>
    apiClient.get<EntityListResponse>(`/workspaces/${workspaceId}/versions/entities/${entityId}`),

  listEntityTypes: (workspaceId: string) =>
    apiClient.get<EntityTypeResponse>(`/workspaces/${workspaceId}/entities/types`),

  createEntityType: (workspaceId: string, data: {
    name: string;
    color?: string;
    icon?: string;
    schema?: Record<string, unknown>;
  }) => apiClient.post(`/workspaces/${workspaceId}/entities/types`, data),

  getEntityType: (workspaceId: string, typeId: string) =>
    apiClient.get<{ data: EntityType }>(`/workspaces/${workspaceId}/entities/types/${typeId}`),

  updateEntityType: (workspaceId: string, typeId: string, data: Partial<{ name: string; color: string; icon: string; schema: Record<string, unknown> }>) =>
    apiClient.patch<{ data: EntityType }>(`/workspaces/${workspaceId}/entities/types/${typeId}`, data),

  deleteEntityType: (workspaceId: string, typeId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/entities/types/${typeId}`),

  listEntityProperties: (workspaceId: string) =>
    apiClient.get<{ data: EntityProperty[] }>(`/workspaces/${workspaceId}/entities/properties`),

  createEntityProperty: (workspaceId: string, data: {
    name: string;
    entity_type_id?: string | null;
    type: PropertyType;
    description?: string | null;
    required?: boolean;
    options?: Record<string, unknown>;
    config?: Record<string, unknown>;
    default_value?: unknown;
  }) => apiClient.post<{ data: EntityProperty }>(`/workspaces/${workspaceId}/entities/properties`, data),
};
