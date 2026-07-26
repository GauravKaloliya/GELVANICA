import { apiClient } from "../apiClient";
import type { Tag, EntityTag } from "../types";

interface TagResponse {
  data: Tag;
}

interface TagListResponse {
  data: Tag[];
  meta?: { total: number };
}

export const tagService = {
  list: (workspaceId: string) =>
    apiClient.get<TagListResponse>(`/workspaces/${workspaceId}/tags/`),

  create: (workspaceId: string, data: { name: string; color?: string }) =>
    apiClient.post<TagResponse>(`/workspaces/${workspaceId}/tags/`, data),

  get: (workspaceId: string, tagId: string) =>
    apiClient.get<TagResponse>(`/workspaces/${workspaceId}/tags/${tagId}`),

  update: (workspaceId: string, tagId: string, data: { name?: string; color?: string }) =>
    apiClient.patch<TagResponse>(`/workspaces/${workspaceId}/tags/${tagId}`, data),

  delete: (workspaceId: string, tagId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/tags/${tagId}`),

  restore: (workspaceId: string, tagId: string) =>
    apiClient.post<TagResponse>(`/workspaces/${workspaceId}/tags/${tagId}/restore`),

  attachToEntity: (workspaceId: string, tagId: string, entityId: string) =>
    apiClient.post<{ data: EntityTag }>(`/workspaces/${workspaceId}/tags/${tagId}/entities/${entityId}`),

  detachFromEntity: (workspaceId: string, tagId: string, entityId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/tags/${tagId}/entities/${entityId}`),
};
