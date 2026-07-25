export interface GraphNode {
  id: string;
  title: string;
  type: string;
  icon: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
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

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  distance: number;
}
