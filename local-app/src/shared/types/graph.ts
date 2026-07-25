export interface GraphNode {
  id: string
  label: string
  type: string
  properties?: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
  properties?: Record<string, unknown>
}

export interface GraphQueryRequest {
  workspace_id: string
  node_types?: string[]
  edge_types?: string[]
  limit?: number
}

export interface GraphQueryResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface GraphTraverseRequest {
  workspace_id: string
  center_node: string
  depth?: number
}

export interface GraphPathsRequest {
  workspace_id: string
  source_entity_id: string
  target_entity_id: string
}

export interface GraphSnapshot {
  id: string
  workspace_id: string
  graph_snapshot: {
    nodes: GraphNode[]
    edges: GraphEdge[]
    generated_at: string
  }
  version_hash: string
  generated_at: string
}
