import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient, ApiError } from "@/lib/apiClient";
import type { GraphNode, GraphEdge, GraphSnapshot, GraphPath } from "@/lib/types";

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  isLoading: boolean;
  error: string | null;
  versionHash: string | null;
  generatedAt: string | null;

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  setError: (error: string | null) => void;

  fetchGraph: (token: string, workspaceId: string) => Promise<void>;
  materialize: (token: string, workspaceId: string) => Promise<void>;
  queryGraph: (token: string, workspaceId: string, filters?: {
    relation_types?: string[];
    entity_type_ids?: string[];
    limit?: number;
  }) => Promise<void>;
  traverse: (token: string, workspaceId: string, centerNode: string, depth?: number, relationTypes?: string[]) => Promise<void>;
  findPath: (token: string, workspaceId: string, sourceId: string, targetId: string) => Promise<GraphPath | null>;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  isLoading: false,
  error: null,
  versionHash: null,
  generatedAt: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  setError: (error) => set({ error }),

  fetchGraph: async (token, workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get<{ data: GraphSnapshot }>(`/workspaces/${workspaceId}/graph/`, token);
      const snapshot = res.data;
      set({
        nodes: snapshot.graph_snapshot.nodes,
        edges: snapshot.graph_snapshot.edges,
        versionHash: snapshot.version_hash,
        generatedAt: snapshot.graph_snapshot.generated_at,
        isLoading: false,
      });
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 404) {
        await get().materialize(token, workspaceId);
      } else {
        set({ error: err.message, isLoading: false });
      }
    }
  },

  materialize: async (token, workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(`/workspaces/${workspaceId}/graph/materialize`, undefined, token);
      await get().fetchGraph(token, workspaceId);
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  queryGraph: async (token, workspaceId, filters) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<{ data: { nodes: GraphNode[]; edges: GraphEdge[] } }>(`/workspaces/${workspaceId}/graph/query`, filters, token);
      set({ nodes: res.data.nodes, edges: res.data.edges, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  traverse: async (token, workspaceId, centerNode, depth = 2, relationTypes) => {
    set({ isLoading: true, error: null });
    try {
      const body: Record<string, unknown> = {
        center_node: centerNode,
        depth,
      };
      if (relationTypes) body.relation_types = relationTypes;

      const res = await apiClient.post<{ data: { nodes: GraphNode[]; edges: GraphEdge[] } }>(`/workspaces/${workspaceId}/graph/traverse`, body, token);
      set({ nodes: res.data.nodes, edges: res.data.edges, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  findPath: async (token, workspaceId, sourceId, targetId) => {
    try {
      const res = await apiClient.post<{ data: GraphPath }>(`/workspaces/${workspaceId}/graph/paths`, {
        source_entity_id: sourceId,
        target_entity_id: targetId,
      }, token);
      return res.data;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },
}),
    {
      name: "gnovium-graph",
      partialize: (state) => ({
        selectedNodeId: state.selectedNodeId,
        hoveredNodeId: state.hoveredNodeId,
      }),
    }
  )
);
