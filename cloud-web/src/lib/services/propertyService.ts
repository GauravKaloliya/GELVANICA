import { apiClient } from "../apiClient";
import type { EntityProperty, PropertyType } from "../types";

interface PropertyListResponse {
  data: EntityProperty[];
  meta?: { total: number };
}

interface PropertyResponse {
  data: EntityProperty;
}

export const propertyService = {
  create: (workspaceId: string, data: {
    name: string;
    entity_type_id?: string | null;
    type: PropertyType;
    description?: string | null;
    required?: boolean;
    options?: Record<string, unknown>;
    config?: Record<string, unknown>;
    default_value?: unknown;
  }) => apiClient.post<PropertyResponse>(`/workspaces/${workspaceId}/properties/`, data),

  list: (workspaceId: string) =>
    apiClient.get<PropertyListResponse>(`/workspaces/${workspaceId}/properties/`),

  get: (workspaceId: string, propertyId: string) =>
    apiClient.get<PropertyResponse>(`/workspaces/${workspaceId}/properties/${propertyId}`),

  update: (workspaceId: string, propertyId: string, data: Partial<{
    name: string;
    entity_type_id: string | null;
    type: PropertyType;
    description: string | null;
    required: boolean;
    options: Record<string, unknown>;
    config: Record<string, unknown>;
    default_value: unknown;
  }>) => apiClient.patch<PropertyResponse>(`/workspaces/${workspaceId}/properties/${propertyId}`, data),

  delete: (workspaceId: string, propertyId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/properties/${propertyId}`),

  restore: (workspaceId: string, propertyId: string) =>
    apiClient.post<PropertyResponse>(`/workspaces/${workspaceId}/properties/${propertyId}/restore`),
};
