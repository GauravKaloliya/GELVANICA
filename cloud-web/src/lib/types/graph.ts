export interface GraphNode {
  id: string;
  title: string;
  type: string;
  icon: string | null;
}

export interface GraphEdge {
  id: string; source: string; target: string; type: string; label?: string;
}

export interface GraphSnapshot {
  id: string;
  workspace_id: string;
  graph_snapshot: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    generated_at: string;
  };
  version_hash: string;
  generated_at: string;
}

export interface GraphQueryResult {
  workspace_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
}

export interface GraphMaterialization {
  id: string;
  workspace_id: string;
  graph_snapshot: Record<string, unknown>;
  generated_at: string;
  version_hash: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  distance: number;
}
