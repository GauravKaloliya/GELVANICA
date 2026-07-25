import { apiClient } from "../apiClient";
import type { Entity, EntityType, PropertyType, EntityVersion } from "../types";

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

interface VersionListResponse {
  data: EntityVersion[];
  meta?: { total: number };
}

export const entityService = {
  list: (workspaceId: string, params?: { entity_type_id?: string; parent_id?: string; page?: number; per_page?: number }) => {
    const sp = new URLSearchParams({ workspace_id: workspaceId });
    if (params?.entity_type_id) sp.set("entity_type_id", params.entity_type_id);
    if (params?.parent_id) sp.set("parent_id", params.parent_id);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    return apiClient.get<EntityListResponse>(`/entities/?${sp}`);
  },

  create: (data: {
    workspace_id: string;
    title?: string;
    entity_type_id?: string;
    parent_id?: string;
    properties?: Record<string, unknown>;
  }) => apiClient.post<EntityResponse>("/entities/", data),

  get: (entityId: string) =>
    apiClient.get<EntityResponse>(`/entities/${entityId}`),

  update: (entityId: string, data: {
    title?: string;
    entity_type_id?: string;
    status?: string;
    properties?: Record<string, unknown>;
  }) => apiClient.patch<EntityResponse>(`/entities/${entityId}`, data),

  delete: (entityId: string) =>
    apiClient.delete(`/entities/${entityId}`),

  restore: (entityId: string) =>
    apiClient.post<EntityResponse>(`/entities/${entityId}/restore`),

  archive: (entityId: string) =>
    apiClient.post<EntityResponse>(`/entities/${entityId}/archive`),

  duplicate: (entityId: string) =>
    apiClient.post<EntityResponse>(`/entities/${entityId}/duplicate`),

  listChildren: (entityId: string) =>
    apiClient.get<EntityListResponse>(`/entities/${entityId}/children`),

  createChild: (entityId: string, data: {
    title?: string;
    entity_type_id?: string;
    properties?: Record<string, unknown>;
  }) => apiClient.post<EntityResponse>(`/entities/${entityId}/children`, data),

  listVersions: (entityId: string) =>
    apiClient.get<VersionListResponse>(`/entities/${entityId}/versions`),

  createEntityType: (data: {
    workspace_id: string;
    name: string;
    color?: string;
    icon?: string;
    schema?: Record<string, unknown>;
  }) => apiClient.post("/entities/types", data),

  listEntityTypes: (workspaceId: string) =>
    apiClient.get<EntityTypeResponse>(`/entities/types?workspace_id=${workspaceId}`),

  createProperty: (data: {
    workspace_id: string;
    name: string;
    type: string;
    entity_type_id?: string;
    options?: Record<string, unknown>;
  }) => apiClient.post("/entities/properties", data),

  listProperties: (workspaceId: string) =>
    apiClient.get<PropertyResponse>(`/entities/properties?workspace_id=${workspaceId}`),
};
