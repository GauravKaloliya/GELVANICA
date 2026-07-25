import { get, post } from './client'
import type {
  GraphSnapshot,
  GraphQueryResponse,
} from '@shared/types'

export const graphApi = {
  get: (workspaceId: string) =>
    get<GraphSnapshot>('/graph/', { params: { workspace_id: workspaceId } }),
  materialize: (workspaceId: string) =>
    post<GraphSnapshot>('/graph/materialize', { workspace_id: workspaceId }),
  query: (workspaceId: string, params?: { node_types?: string[]; edge_types?: string[]; limit?: number }) =>
    post<GraphQueryResponse>('/graph/query', { workspace_id: workspaceId, ...params }),
  traverse: (workspaceId: string, entityId: string, depth?: number) =>
    post<GraphQueryResponse>('/graph/traverse', { workspace_id: workspaceId, center_node: entityId, depth: depth ?? 3 }),
  paths: (workspaceId: string, sourceId: string, targetId: string) =>
    post<Array<{ entity_id: string; relation_type: string }>>('/graph/paths', { workspace_id: workspaceId, source_entity_id: sourceId, target_entity_id: targetId }),
}
