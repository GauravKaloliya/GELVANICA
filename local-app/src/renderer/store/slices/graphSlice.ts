import { StateCreator } from 'zustand'
import type { GraphNode, GraphEdge } from '@shared/types'
import type { StoreState } from '../index'

export interface GraphSlice {
  graphNodes: GraphNode[]
  graphEdges: GraphEdge[]
  selectedNodeId: string | null
  selectedNodeIds: string[]
  hoveredNodeId: string | null
  pinnedNodeIds: string[]
  graphFilter: {
    nodeTypes: string[]
    edgeTypes: string[]
  }
  graphLayout: 'force' | 'radial' | 'tree'
  graphZoom: number

  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void
  setSelectedNode: (id: string | null) => void
  toggleNodeSelection: (id: string) => void
  clearSelection: () => void
  pinNode: (id: string) => void
  unpinNode: (id: string) => void
  unpinAllNodes: () => void
  setHoveredNode: (id: string | null) => void
  setGraphFilter: (filter: Partial<GraphSlice['graphFilter']>) => void
  setGraphLayout: (layout: GraphSlice['graphLayout']) => void
  setGraphZoom: (zoom: number) => void
  clearGraph: () => void
}

export const createGraphSlice: StateCreator<StoreState, [], [], GraphSlice> = (set) => ({
  graphNodes: [],
  graphEdges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  hoveredNodeId: null,
  pinnedNodeIds: [],
  graphFilter: { nodeTypes: [], edgeTypes: [] },
  graphLayout: 'force',
  graphZoom: 1,

  setGraphData: (graphNodes, graphEdges) => set({ graphNodes, graphEdges }),

  setSelectedNode: (selectedNodeId) => set({ selectedNodeId, selectedNodeIds: selectedNodeId ? [selectedNodeId] : [] }),

  toggleNodeSelection: (id) =>
    set((state) => {
      const idx = state.selectedNodeIds.indexOf(id)
      const next = [...state.selectedNodeIds]
      if (idx >= 0) {
        next.splice(idx, 1)
      } else {
        next.push(id)
      }
      return {
        selectedNodeIds: next,
        selectedNodeId: next.length === 1 ? next[0]! : next.length === 0 ? null : state.selectedNodeId,
      }
    }),

  clearSelection: () => set({ selectedNodeIds: [], selectedNodeId: null }),

  pinNode: (id) =>
    set((state) => {
      if (state.pinnedNodeIds.includes(id)) return state
      return { pinnedNodeIds: [...state.pinnedNodeIds, id] }
    }),

  unpinNode: (id) =>
    set((state) => ({
      pinnedNodeIds: state.pinnedNodeIds.filter((pid) => pid !== id),
    })),

  unpinAllNodes: () => set({ pinnedNodeIds: [] }),

  setHoveredNode: (hoveredNodeId) => set({ hoveredNodeId }),

  setGraphFilter: (filter) =>
    set((state) => ({
      graphFilter: { ...state.graphFilter, ...filter },
    })),

  setGraphLayout: (graphLayout) => set({ graphLayout }),

  setGraphZoom: (graphZoom) => set({ graphZoom }),

  clearGraph: () =>
    set({
      graphNodes: [],
      graphEdges: [],
      selectedNodeId: null,
      selectedNodeIds: [],
      hoveredNodeId: null,
    }),
})
