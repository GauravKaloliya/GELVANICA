import { apiClient } from "../apiClient";
import type { GraphSnapshot, GraphQueryResult, GraphPath, GraphNode, GraphEdge } from "../types";

interface GraphResponse {
  data: GraphSnapshot;
}

interface GraphQueryResponse {
  data: GraphQueryResult;
}

interface GraphTraverseResponse {
  data: { nodes: GraphNode[]; edges: GraphEdge[] };
}

interface GraphPathsResponse {
  data: GraphPath[];
}

export const graphService = {
  get: (workspaceId: string, params?: { entity_id?: string; depth?: number; filter_type?: string; include_tags?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.entity_id) sp.set("entity_id", params.entity_id);
    if (params?.depth) sp.set("depth", String(params.depth));
    if (params?.filter_type) sp.set("filter_type", params.filter_type);
    if (params?.include_tags) sp.set("include_tags", String(params.include_tags));
    const qs = sp.toString();
    return apiClient.get<GraphResponse>(`/workspaces/${workspaceId}/graph/${qs ? `?${qs}` : ""}`);
  },

  materialize: (workspaceId: string) =>
    apiClient.post<GraphResponse>(`/workspaces/${workspaceId}/graph/materialize`),

  query: (workspaceId: string, data: {
    relation_types?: string[];
    entity_type_ids?: string[];
    limit?: number;
  }) => apiClient.post<GraphQueryResponse>(`/workspaces/${workspaceId}/graph/query`, { ...data, workspace_id: workspaceId }),

  traverse: (workspaceId: string, data: {
    entity_id: string;
    depth?: number;
    relation_types?: string[];
  }) => apiClient.post<GraphTraverseResponse>(`/workspaces/${workspaceId}/graph/traverse`, data),

  paths: (workspaceId: string, data: {
    source_entity_id: string;
    target_entity_id: string;
  }) => apiClient.post<GraphPathsResponse>(`/workspaces/${workspaceId}/graph/paths`, data),

  cleanup: (workspaceId: string) =>
    apiClient.post<{ data: { cleaned: number } }>(`/workspaces/${workspaceId}/graph/cleanup`),

  search: (workspaceId: string, query: string) =>
    apiClient.get<{ data: GraphNode[] }>(`/workspaces/${workspaceId}/graph/search?q=${encodeURIComponent(query)}`),
};
