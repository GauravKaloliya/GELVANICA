import { API_BASE } from "@/lib/config/constants";
import type { Tag, EntityTag } from "@/lib/types";

interface TagResponse {
  data: Tag;
}

interface TagListResponse {
  data: Tag[];
  meta?: { total: number };
}

interface EntityTagListResponse {
  data: EntityTag[];
  meta?: { total: number };
}

async function tagApi<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Tag request failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const tagService = {
  list: async (token: string, workspaceId: string): Promise<Tag[]> => {
    const res = await tagApi<TagListResponse>(`/tags/?workspace_id=${workspaceId}`, token);
    return res.data || [];
  },

  create: async (token: string, data: { workspace_id: string; name: string; color?: string }): Promise<Tag> => {
    const res = await tagApi<TagResponse>("/tags/", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  update: async (token: string, tagId: string, data: { name?: string; color?: string }): Promise<Tag> => {
    const res = await tagApi<TagResponse>(`/tags/${tagId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  delete: async (token: string, tagId: string): Promise<void> => {
    await tagApi(`/tags/${tagId}`, token, { method: "DELETE" });
  },

  listEntities: async (token: string, tagId: string, workspaceId: string): Promise<EntityTag[]> => {
    const res = await tagApi<EntityTagListResponse>(
      `/tags/${tagId}/entities?workspace_id=${workspaceId}`,
      token
    );
    return res.data || [];
  },

  attachToEntity: async (token: string, tagId: string, entityId: string): Promise<EntityTag> => {
    const res = await tagApi<{ data: EntityTag }>(`/tags/${tagId}/entities`, token, {
      method: "POST",
      body: JSON.stringify({ entity_id: entityId }),
    });
    return res.data;
  },

  detachFromEntity: async (token: string, tagId: string, entityId: string): Promise<void> => {
    await tagApi(`/tags/${tagId}/entities/${entityId}`, token, { method: "DELETE" });
  },
};
