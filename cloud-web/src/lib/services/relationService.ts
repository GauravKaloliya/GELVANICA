import { API_BASE } from "@/lib/config/constants";
import type { Relation } from "@/lib/types";

interface RelationResponse {
  data: Relation;
}

interface RelationListResponse {
  data: Relation[];
  meta?: { total: number };
}

async function relationApi<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Relation request failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const relationService = {
  list: async (token: string, workspaceId: string): Promise<Relation[]> => {
    const res = await relationApi<RelationListResponse>(`/relations/?workspace_id=${workspaceId}`, token);
    return res.data || [];
  },

  listByEntity: async (token: string, entityId: string): Promise<Relation[]> => {
    const res = await relationApi<RelationListResponse>(`/relations/entity/${entityId}`, token);
    return res.data || [];
  },

  create: async (token: string, data: {
    workspace_id: string;
    source_entity_id: string;
    target_entity_id: string;
    relation_type: string;
    metadata?: Record<string, unknown>;
  }): Promise<Relation> => {
    const res = await relationApi<RelationResponse>("/relations/", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  delete: async (token: string, relationId: string): Promise<void> => {
    await relationApi(`/relations/${relationId}`, token, { method: "DELETE" });
  },

  verify: async (token: string, relationId: string): Promise<Relation> => {
    const res = await relationApi<RelationResponse>(`/relations/${relationId}/verify`, token, {
      method: "POST",
    });
    return res.data;
  },

  listByWorkspace: async (token: string, workspaceId: string, params?: {
    source_entity_id?: string;
    target_entity_id?: string;
    relation_type?: string;
  }): Promise<Relation[]> => {
    const sp = new URLSearchParams({ workspace_id: workspaceId });
    if (params?.source_entity_id) sp.set("source_entity_id", params.source_entity_id);
    if (params?.target_entity_id) sp.set("target_entity_id", params.target_entity_id);
    if (params?.relation_type) sp.set("relation_type", params.relation_type);
    const res = await relationApi<RelationListResponse>(`/relations/?${sp}`, token);
    return res.data || [];
  },
};
