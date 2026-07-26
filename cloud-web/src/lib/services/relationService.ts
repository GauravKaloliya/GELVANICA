import { apiClient } from "../apiClient";
import type { Relation } from "@/lib/types";

export const relationService = {
  list: (workspaceId: string) =>
    apiClient.get<{data: Relation[]}>(`/workspaces/${workspaceId}/relations/`),

  listByEntity: (workspaceId: string, entityId: string) =>
    apiClient.get<{data: Relation[]}>(`/workspaces/${workspaceId}/relations/entity/${entityId}`),

  create: (workspaceId: string, data: {
    source_id: string; target_id: string;
    type: string; metadata?: Record<string, unknown>;
  }) => apiClient.post<{data: Relation}>(`/workspaces/${workspaceId}/relations/`, data),

  get: (workspaceId: string, relationId: string) =>
    apiClient.get<{data: Relation}>(`/workspaces/${workspaceId}/relations/${relationId}`),

  update: (workspaceId: string, relationId: string, data: { label?: string; properties?: Record<string, unknown>; verified?: boolean; confidence?: number | null }) =>
    apiClient.patch<{data: Relation}>(`/workspaces/${workspaceId}/relations/${relationId}`, data),

  delete: (workspaceId: string, relationId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/relations/${relationId}`),

  restore: (workspaceId: string, relationId: string) =>
    apiClient.post<{data: Relation}>(`/workspaces/${workspaceId}/relations/${relationId}/restore`),

  backlinks: (workspaceId: string, entityId: string) =>
    apiClient.get<{data: Relation[]}>(`/workspaces/${workspaceId}/relations/backlinks/${entityId}`),

  neighbors: (workspaceId: string, entityId: string, depth?: number) =>
    apiClient.get<{data: {nodes: unknown[]; edges: unknown[]}}>(
      `/workspaces/${workspaceId}/relations/neighbors/${entityId}${depth ? `?depth=${depth}` : ""}`
    ),

  shortestPath: (workspaceId: string, sourceId: string, targetId: string) =>
    apiClient.get<{data: {nodes: unknown[]; edges: unknown[]; distance: number}}>(
      `/workspaces/${workspaceId}/relations/path?source_entity_id=${sourceId}&target_entity_id=${targetId}`
    ),

  batch: (workspaceId: string, data: { relations: Array<{ source_id: string; target_id: string; type: string }> }) =>
    apiClient.post<{data: {created: number}}>(`/workspaces/${workspaceId}/relations/batch`, data),

};
