import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { GraphFilters } from '@/components/graph/GraphFilters'
import KnowledgeGraph from '@/components/graph/KnowledgeGraph'
import { useStore } from '@/store'
import { useGraph, useMaterializeGraph } from '@/hooks/useGraph'
import type { GraphNode, GraphEdge } from '@shared/types'

export default function GraphView() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: graphSnapshot, isLoading } = useGraph(activeWorkspaceId ?? '')
  const materialize = useMaterializeGraph()

  const [activeNodeTypes, setActiveNodeTypes] = useState<Set<string>>(new Set())
  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<string>>(new Set())

  const allNodes: GraphNode[] = useMemo(() => graphSnapshot?.graph_snapshot?.nodes ?? [], [graphSnapshot])
  const allEdges: GraphEdge[] = useMemo(() => graphSnapshot?.graph_snapshot?.edges ?? [], [graphSnapshot])

  const nodes = useMemo(() => {
    if (activeNodeTypes.size === 0) return allNodes
    return allNodes.filter((n) => activeNodeTypes.has(n.type))
  }, [allNodes, activeNodeTypes])

  const edges = useMemo(() => {
    if (activeEdgeTypes.size === 0 && activeNodeTypes.size === 0) return allEdges
    const nodeIds = new Set(nodes.map((n) => n.id))
    return allEdges.filter((e) => {
      const typeMatch = activeEdgeTypes.size === 0 || activeEdgeTypes.has(e.label)
      const nodeMatch = activeNodeTypes.size === 0 || nodeIds.has(e.source) || nodeIds.has(e.target)
      return typeMatch && nodeMatch
    })
  }, [allEdges, activeEdgeTypes, activeNodeTypes, nodes])

  const handleToggleNodeType = useCallback((type: string) => {
    setActiveNodeTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const handleToggleEdgeType = useCallback((type: string) => {
    setActiveEdgeTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const handleShowAll = useCallback(() => {
    setActiveNodeTypes(new Set())
    setActiveEdgeTypes(new Set())
  }, [])

  const handleHideAll = useCallback(() => {
    setActiveNodeTypes(new Set(nodes.map((n) => n.type)))
    setActiveEdgeTypes(new Set(allEdges.map((e) => e.label)))
  }, [nodes, allEdges])

  if (!activeWorkspaceId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full items-center justify-center">
        <EmptyState icon={<Globe className="h-6 w-6 text-muted-foreground" />} title="No workspace selected" description="Select a workspace to view its knowledge graph." />
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">Graph View</h1>
          <GraphFilters
            nodes={allNodes}
            edges={allEdges}
            activeNodeTypes={activeNodeTypes}
            activeEdgeTypes={activeEdgeTypes}
            onToggleNodeType={handleToggleNodeType}
            onToggleEdgeType={handleToggleEdgeType}
            onShowAll={handleShowAll}
            onHideAll={handleHideAll}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{nodes.length} nodes</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{edges.length} edges</span>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="relative flex-1 overflow-hidden bg-background">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<Globe className="h-6 w-6 text-muted-foreground" />}
              title="No graph data"
              description="Generate a graph snapshot to visualize your knowledge connections."
            />
          </div>
        ) : (
          <KnowledgeGraph
            nodes={nodes}
            edges={edges}
            isLoading={isLoading}
            isRefreshing={materialize.isPending}
            onRefresh={() => activeWorkspaceId && materialize.mutate(activeWorkspaceId)}
          />
        )}
      </div>
    </motion.div>
  )
}
