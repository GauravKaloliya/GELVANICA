import React, { useState, useMemo, useCallback, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  type ReactFlowInstance,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import { toPng, toSvg } from 'html-to-image'
import { Layers, Tag, Network, Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GraphControls } from '@/components/graph/GraphControls'
import { GraphFilters } from '@/components/graph/GraphFilters'
import { GraphInfoPanel } from '@/components/graph/GraphInfoPanel'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/router'
import { useStore } from '@/store'
import type { GraphNode, GraphEdge } from '@shared/types'

export interface GraphNodeData {
  [key: string]: unknown
  label: string
  entityType: string
  blockCount: number
  isSelected: boolean
  isDimmed: boolean
  nodeColor: string
  icon: string | null
  isPinned: boolean
}

type RFNode = Node<GraphNodeData>
type RFEdge = Edge<{ label: string }>

const NODE_COLORS: Record<string, string> = {
  entity: '#6366f1',
  tag: '#10b981',
  default: '#8b5cf6',
}

function getNodeColor(type: string | null): string {
  if (!type) return NODE_COLORS.default!
  return NODE_COLORS[type] ?? NODE_COLORS.default!
}

const NODE_ICONS: Record<string, typeof Layers> = {
  entity: Layers,
  tag: Tag,
  default: Network,
}

function getNodeIcon(type: string | null): typeof Layers {
  if (!type) return NODE_ICONS.default!
  return NODE_ICONS[type] ?? NODE_ICONS.default!
}

const NODE_W = 180
const NODE_H = 56

function dagreLayout(
  rfNodes: RFNode[],
  rfEdges: RFEdge[],
  direction: 'TB' | 'LR' = 'LR'
): RFNode[] {
  if (rfNodes.length === 0) return rfNodes

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 })

  for (const node of rfNodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H })
  }
  for (const edge of rfEdges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return rfNodes.map((node) => {
    const pos = g.node(node.id)
    if (!pos) return node
    return {
      ...node,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    }
  })
}

function radialLayout(
  rfNodes: RFNode[],
  rfEdges: RFEdge[],
  centerNodeId?: string | null
): RFNode[] {
  if (rfNodes.length === 0) return rfNodes
  if (rfNodes.length === 1) return [{ ...rfNodes[0]!, position: { x: 0, y: 0 } }]

  const degree = new Map<string, number>()
  for (const node of rfNodes) degree.set(node.id, 0)
  for (const edge of rfEdges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }

  const centerId = centerNodeId ?? rfNodes[0]?.id

  const sorted = [...rfNodes].sort((a, b) => {
    if (a.id === centerId) return -1
    if (b.id === centerId) return 1
    return (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
  })

  const nodesPerRing = Math.max(6, Math.ceil(Math.sqrt(sorted.length)))
  const spacing = 200

  const remaining = sorted.slice(1)
  const rings: RFNode[][] = []
  for (let i = 0; i < remaining.length; i += nodesPerRing) {
    rings.push(remaining.slice(i, i + nodesPerRing))
  }

  const result: RFNode[] = [{ ...sorted[0]!, position: { x: 0, y: 0 } }]

  for (let ringIdx = 0; ringIdx < rings.length; ringIdx++) {
    const ring = rings[ringIdx]!
    const radius = (ringIdx + 1) * spacing
    for (let j = 0; j < ring.length; j++) {
      const angle = (j / ring.length) * 2 * Math.PI
      result.push({
        ...ring[j]!,
        position: {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        },
      })
    }
  }

  return result
}

function forceLayout(
  rfNodes: RFNode[],
  rfEdges: RFEdge[],
  pinnedNodes: Set<string>
): RFNode[] {
  if (rfNodes.length === 0) return rfNodes

  const posMap = new Map<string, { x: number; y: number }>()
  for (const n of rfNodes) posMap.set(n.id, n.position)

  const simNodes: Record<string, unknown>[] = rfNodes.map((n) => ({
    id: n.id,
    x: posMap.get(n.id)?.x ?? 0,
    y: posMap.get(n.id)?.y ?? 0,
    ...(pinnedNodes.has(n.id)
      ? { fx: posMap.get(n.id)?.x ?? 0, fy: posMap.get(n.id)?.y ?? 0 }
      : {}),
  }))

  const simLinks = rfEdges.map((e) => ({
    source: e.source,
    target: e.target,
  }))

  const simulation = forceSimulation(simNodes as Parameters<typeof forceSimulation>[0])
    .force(
      'link',
      forceLink(simLinks as Parameters<typeof forceLink>[0])
        .id((d: unknown) => (d as { id: string }).id)
        .distance(120)
    )
    .force('charge', forceManyBody().strength(-300))
    .force('center', forceCenter(0, 0))
    .force('collision', forceCollide(60))
    .stop()

  for (let i = 0; i < 300; i++) simulation.tick()

  return rfNodes.map((n) => {
    const sn = simNodes.find((s) => (s as { id: string }).id === n.id) as
      | { x?: number; y?: number }
      | undefined
    return {
      ...n,
      position: { x: sn?.x ?? 0, y: sn?.y ?? 0 },
    }
  })
}

function CustomNode({ data }: NodeProps<RFNode>) {
  const d = data as unknown as GraphNodeData
  const Icon = getNodeIcon(d.entityType)

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 shadow-sm transition-all duration-200',
        d.isSelected
          ? 'ring-2 ring-offset-1 ring-offset-background'
          : 'hover:shadow-md'
      )}
      style={{
        width: NODE_W,
        borderColor: d.nodeColor + '40',
        backgroundColor: d.nodeColor + '10',
        opacity: d.isDimmed ? 0.2 : 1,
        ...(d.isSelected
          ? { ringColor: d.nodeColor, boxShadow: `0 0 0 2px ${d.nodeColor}30` }
          : {}),
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-transparent" />

      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: d.nodeColor + '20' }}
      >
        <Icon className="h-4 w-4" style={{ color: d.nodeColor }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs font-semibold leading-tight text-foreground">
            {d.label}
          </p>
          {d.isPinned && (
            <Pin className="h-2.5 w-2.5 shrink-0 fill-current text-amber-500" />
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="h-3.5 px-1 py-0 text-[8px] font-medium"
            style={{
              color: d.nodeColor,
              borderColor: d.nodeColor + '30',
              backgroundColor: d.nodeColor + '10',
            }}
          >
            {d.entityType || 'unknown'}
          </Badge>
          {d.blockCount > 0 && (
            <span className="text-[8px] text-muted-foreground">
              {d.blockCount} blocks
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}: {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  data?: { label?: string }
  style?: React.CSSProperties
}) {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const mx = sourceX + dx / 2
  const my = sourceY + dy / 2

  return (
    <>
      <path
        id={id}
        d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
        fill="none"
        className="react-flow__edge-path"
        style={style}
      />
      {data?.label && (
        <foreignObject
          x={mx - 30}
          y={my - 10}
          width={60}
          height={20}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center">
            <span className="rounded bg-background/80 px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground backdrop-blur-sm">
              {data.label}
            </span>
          </div>
        </foreignObject>
      )}
    </>
  )
}

interface KnowledgeGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isLoading?: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
  activeNodeTypes?: Set<string>
  activeEdgeTypes?: Set<string>
  onToggleNodeType?: (type: string) => void
  onToggleEdgeType?: (type: string) => void
  onShowAll?: () => void
  onHideAll?: () => void
  className?: string
}

const KnowledgeGraph = React.memo(function KnowledgeGraph({
  nodes,
  edges,
  isLoading: _isLoading = false,
  isRefreshing = false,
  onRefresh,
  activeNodeTypes,
  activeEdgeTypes,
  onToggleNodeType,
  onToggleEdgeType,
  onShowAll,
  onHideAll,
  className,
}: KnowledgeGraphProps) {
  const navigate = useNavigate()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<RFNode, RFEdge> | null>(null)

  const graphLayout = useStore((s) => s.graphLayout)
  const storeSelectedNodeIds = useStore((s) => s.selectedNodeIds)
  const toggleNodeSelection = useStore((s) => s.toggleNodeSelection)
  const clearSelection = useStore((s) => s.clearSelection)
  const pinnedNodeIds = useStore((s) => s.pinnedNodeIds)
  const pinNode = useStore((s) => s.pinNode)
  const unpinNode = useStore((s) => s.unpinNode)
  const unpinAllNodes = useStore((s) => s.unpinAllNodes)

  const selectedNodeIds = useMemo(() => new Set(storeSelectedNodeIds), [storeSelectedNodeIds])
  const pinnedNodes = useMemo(() => new Set(pinnedNodeIds), [pinnedNodeIds])

  const adjacentNodeIds = useMemo(() => {
    if (storeSelectedNodeIds.length === 0) return new Set<string>()
    const ids = new Set<string>(storeSelectedNodeIds)
    for (const selId of storeSelectedNodeIds) {
      for (const e of edges) {
        if (e.source === selId) ids.add(e.target)
        if (e.target === selId) ids.add(e.source)
      }
    }
    return ids
  }, [storeSelectedNodeIds, edges])

  const filteredEdges = useMemo(() => {
    if (!activeEdgeTypes || activeEdgeTypes.size === 0) return edges
    return edges.filter((e) => activeEdgeTypes.has(e.label))
  }, [edges, activeEdgeTypes])

  const filteredNodes = useMemo(() => {
    if (!activeNodeTypes || activeNodeTypes.size === 0) return nodes
    const visibleNodeIds = new Set(
      nodes.filter((n) => activeNodeTypes.has(n.type)).map((n) => n.id)
    )
    return nodes.filter(
      (n) => visibleNodeIds.has(n.id) || filteredEdges.some((e) => e.source === n.id || e.target === n.id)
    )
  }, [nodes, activeNodeTypes, filteredEdges])

  const initialRfNodes: RFNode[] = useMemo(
    () =>
      filteredNodes.map((n) => ({
        id: n.id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: n.label,
          entityType: n.type,
          blockCount: 0,
          isSelected: selectedNodeIds.has(n.id),
          isDimmed: storeSelectedNodeIds.length > 0 && !adjacentNodeIds.has(n.id),
          nodeColor: getNodeColor(n.type),
          icon: null,
          isPinned: pinnedNodes.has(n.id),
        } satisfies GraphNodeData,
      })),
    [filteredNodes, selectedNodeIds, storeSelectedNodeIds, adjacentNodeIds, pinnedNodes]
  )

  const initialRfEdges: RFEdge[] = useMemo(
    () =>
      filteredEdges.map((e) => {
        const isConnectedToSelected =
          storeSelectedNodeIds.length > 0 &&
          (storeSelectedNodeIds.includes(e.source) || storeSelectedNodeIds.includes(e.target))
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'custom',
          data: { label: e.label },
          animated: isConnectedToSelected,
          style: {
            stroke: isConnectedToSelected ? getNodeColor(null) : undefined,
            opacity: storeSelectedNodeIds.length > 0 && !isConnectedToSelected ? 0.06 : 0.2,
            strokeWidth: isConnectedToSelected ? 2.5 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8',
            width: 16,
            height: 16,
          },
        }
      }),
    [filteredEdges, storeSelectedNodeIds]
  )

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialRfNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialRfEdges)

  useEffect(() => {
    let laid: RFNode[]
    switch (graphLayout) {
      case 'radial':
        laid = radialLayout(initialRfNodes, initialRfEdges, storeSelectedNodeIds[0])
        break
      case 'force':
        laid = forceLayout(initialRfNodes, initialRfEdges, pinnedNodes)
        break
      case 'tree':
      default:
        laid = dagreLayout(initialRfNodes, initialRfEdges)
        break
    }
    setRfNodes(laid)
    setRfEdges(initialRfEdges)
  }, [initialRfNodes, initialRfEdges, graphLayout, storeSelectedNodeIds, pinnedNodes, setRfNodes, setRfEdges])

  const onNodeClick = useCallback(
    (event: ReactMouseEvent, node: Node<GraphNodeData>) => {
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        toggleNodeSelection(node.id)
      } else {
        if (selectedNodeIds.size === 1 && selectedNodeIds.has(node.id)) {
          clearSelection()
        } else {
          clearSelection()
          toggleNodeSelection(node.id)
        }
      }
    },
    [selectedNodeIds, toggleNodeSelection, clearSelection]
  )

  const onNodeDoubleClick = useCallback(
    (_: ReactMouseEvent, node: Node<GraphNodeData>) => {
      navigate(ROUTES.ENTITY.replace(':id', node.id))
    },
    [navigate]
  )

  const onPaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node<GraphNodeData>) => {
      event.preventDefault()
      if (pinnedNodes.has(node.id)) {
        unpinNode(node.id)
      } else {
        pinNode(node.id)
      }
    },
    [pinnedNodes, pinNode, unpinNode]
  )

  const handleFitView = useCallback(() => {
    rfInstance?.fitView({ padding: 0.2 })
  }, [rfInstance])

  const handleResetView = useCallback(() => {
    rfInstance?.fitView({ padding: 0.2, duration: 300 })
    clearSelection()
  }, [rfInstance, clearSelection])

  const handleExportPng = useCallback(async () => {
    const el = reactFlowWrapper.current
    if (!el) return
    const dataUrl = await toPng(el, { quality: 1, pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = 'gnovium-graph.png'
    link.href = dataUrl
    link.click()
  }, [])

  const handleExportSvg = useCallback(async () => {
    const el = reactFlowWrapper.current
    if (!el) return
    const dataUrl = await toSvg(el, { pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = 'gnovium-graph.svg'
    link.href = dataUrl
    link.click()
  }, [])

  const handleExportJson = useCallback(() => {
    const payload = {
      nodes: filteredNodes,
      edges: filteredEdges,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'gnovium-graph.json'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [filteredNodes, filteredEdges])

  const selectedNodes = useMemo(
    () => nodes.filter((n) => selectedNodeIds.has(n.id)),
    [selectedNodeIds, nodes]
  )

  const nodeTypes: NodeTypes = useMemo(() => ({ custom: CustomNode as never }), [])
  const edgeTypes: EdgeTypes = useMemo(() => ({ custom: CustomEdge as never }), [])

  return (
    <div className={cn('relative flex h-full flex-col', className)}>
      {onToggleNodeType && onToggleEdgeType && onShowAll && onHideAll && (
        <div className="absolute left-4 top-4 z-20">
          <GraphFilters
            nodes={nodes}
            edges={edges}
            activeNodeTypes={activeNodeTypes ?? new Set()}
            activeEdgeTypes={activeEdgeTypes ?? new Set()}
            onToggleNodeType={onToggleNodeType}
            onToggleEdgeType={onToggleEdgeType}
            onShowAll={onShowAll}
            onHideAll={onHideAll}
          />
        </div>
      )}

      <div className="absolute left-4 top-14 z-20">
        <GraphControls
          zoom={rfInstance?.getZoom() ?? 1}
          onZoomIn={() => rfInstance?.zoomIn()}
          onZoomOut={() => rfInstance?.zoomOut()}
          onFit={handleFitView}
          onReset={handleResetView}
          isLocked={false}
          onToggleLock={() => {}}
          showGrid={false}
          onToggleGrid={() => {}}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          nodeCount={filteredNodes.length}
          edgeCount={filteredEdges.length}
          onExportPng={handleExportPng}
          onExportSvg={handleExportSvg}
          onExportJson={handleExportJson}
          pinnedCount={pinnedNodes.size}
          onUnpinAll={unpinAllNodes}
        />
      </div>

      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow<RFNode, RFEdge>
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          onInit={(instance) => setRfInstance(instance as ReactFlowInstance<RFNode, RFEdge>)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: 'custom',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#94a3b8',
              width: 16,
              height: 16,
            },
          }}
        >
          <Background color="#94a3b8" gap={20} size={1} />
          <Controls
            showInteractive={false}
            className="!bottom-4 !left-4 !top-auto !z-10 !rounded-xl !border !bg-background/95 !shadow-lg"
          />
          <MiniMap
            nodeColor={(node) => {
              const d = node.data as unknown as GraphNodeData
              return d.nodeColor ?? '#8b5cf6'
            }}
            maskColor="hsl(var(--background) / 0.8)"
            className="!bottom-4 !right-4 !z-10 !rounded-xl !border !bg-background/95 !shadow-lg"
          />
        </ReactFlow>
      </div>

      <GraphInfoPanel
        selectedNodeIds={storeSelectedNodeIds}
        nodes={selectedNodes}
        edges={edges}
        allNodes={nodes}
        onClose={clearSelection}
      />
    </div>
  )
})

export default KnowledgeGraph
