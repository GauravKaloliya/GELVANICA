import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore } from '@/store'
import { useGraph } from '@/hooks/useGraph'
import { ROUTES } from '@/router'
import type { GraphNode, GraphEdge } from '@shared/types'

const NODE_COLORS: Record<string, string> = {
  entity: '#6366f1',
  tag: '#f59e0b',
  block: '#10b981',
}

export function GraphMiniMapPanel() {
  const navigate = useNavigate()
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: graphSnapshot, isLoading } = useGraph(activeWorkspaceId ?? '')

  const allNodes: GraphNode[] = useMemo(() => graphSnapshot?.graph_snapshot?.nodes ?? [], [graphSnapshot])
  const allEdges: GraphEdge[] = useMemo(() => graphSnapshot?.graph_snapshot?.edges ?? [], [graphSnapshot])

  const flowNodes: Node[] = useMemo(
    () =>
      allNodes.map((n) => ({
        id: n.id,
        position: { x: Math.random() * 400, y: Math.random() * 300 },
        data: { label: n.label },
        style: {
          background: NODE_COLORS[n.type] ?? '#6366f1',
          color: '#fff',
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 4,
          width: 'auto',
        },
      })),
    [allNodes]
  )

  const flowEdges: Edge[] = useMemo(
    () =>
      allEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        style: { stroke: '#555', strokeWidth: 1 },
        labelStyle: { fontSize: 8 },
      })),
    [allEdges]
  )

  const [nodes] = useNodesState(flowNodes)
  const [edges] = useEdgesState(flowEdges)

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3 w-3" />
            Graph Overview
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => navigate(ROUTES.GRAPH)}
          >
            Full view
          </Button>
        </div>

        <div className="flex-1 min-h-0" style={{ height: 200 }}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Loading graph...
            </div>
          ) : allNodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground text-center px-4">
              No graph data available.
            </div>
          ) : (
            <div
              className="cursor-pointer h-full"
              onClick={() => navigate(ROUTES.GRAPH)}
              title="Open full graph view"
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                panOnDrag={false}
                preventScrolling={false}
              >
                <MiniMap
                  nodeColor={(n) => {
                    const node = allNodes.find((gn) => gn.id === n.id)
                    return NODE_COLORS[node?.type ?? ''] ?? '#6366f1'
                  }}
                  maskColor="rgba(0,0,0,0.5)"
                  style={{ background: 'rgba(0,0,0,0.1)' }}
                />
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              </ReactFlow>
            </div>
          )}
        </div>

        <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-3">
          <span>{allNodes.length} nodes</span>
          <span>{allEdges.length} edges</span>
        </div>
      </div>
    </ScrollArea>
  )
}
