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
  get: (workspaceId: string) =>
    apiClient.get<GraphResponse>(`/graph/?workspace_id=${workspaceId}`),

  materialize: (workspaceId: string) =>
    apiClient.post<GraphResponse>("/graph/materialize", { workspace_id: workspaceId }),

  query: (data: {
    workspace_id: string;
    relation_types?: string[];
    entity_type_ids?: string[];
    limit?: number;
  }) => apiClient.post<GraphQueryResponse>("/graph/query", data),

  traverse: (data: {
    entity_id: string;
    depth?: number;
    relation_types?: string[];
  }) => apiClient.post<GraphTraverseResponse>("/graph/traverse", data),

  paths: (data: {
    source_entity_id: string;
    target_entity_id: string;
  }) => apiClient.post<GraphPathsResponse>("/graph/paths", data),
};
