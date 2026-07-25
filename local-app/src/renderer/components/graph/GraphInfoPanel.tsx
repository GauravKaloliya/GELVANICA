import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ExternalLink,
  Link2,
  Tag,
  ArrowRight,
  Layers,
  Network,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ROUTES } from '@/router'
import { cn } from '@/lib/utils'
import type { GraphNode, GraphEdge } from '@shared/types'

interface GraphInfoPanelProps {
  selectedNodeIds: string[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  allNodes: GraphNode[]
  onClose: () => void
  className?: string
}

const NODE_COLORS: Record<string, string> = {
  entity: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  tag: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  default: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
}

const NODE_ICONS: Record<string, typeof Link2> = {
  entity: Layers,
  tag: Tag,
  default: Network,
}

function getNodeStyle(type: string | null) {
  if (!type) return NODE_COLORS.default
  return NODE_COLORS[type] ?? NODE_COLORS.default
}

function getNodeIcon(type: string | null) {
  if (!type) return NODE_ICONS.default
  return NODE_ICONS[type] ?? NODE_ICONS.default
}

export function GraphInfoPanel({
  selectedNodeIds,
  nodes,
  edges,
  allNodes,
  onClose,
  className,
}: GraphInfoPanelProps) {
  const navigate = useNavigate()

  const isVisible = selectedNodeIds.length > 0
  const isMulti = selectedNodeIds.length > 1
  const singleNode = !isMulti && nodes.length === 1 ? nodes[0]! : null

  const connectedEdges = singleNode
    ? edges.filter((e) => e.source === singleNode.id || e.target === singleNode.id)
    : []

  const incomingEdges = connectedEdges.filter((e) => e.target === singleNode?.id)
  const outgoingEdges = connectedEdges.filter((e) => e.source === singleNode?.id)

  const getConnectedNodeTitle = (nodeId: string) => {
    const n = allNodes.find((n) => n.id === nodeId)
    return n?.label ?? 'Unknown'
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="info-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'absolute right-4 top-4 z-20 w-72 overflow-hidden rounded-xl border bg-background/95 shadow-xl backdrop-blur-sm',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
            <div className="min-w-0 flex-1">
              {isMulti ? (
                <>
                  <h3 className="text-sm font-semibold leading-tight">
                    {selectedNodeIds.length} nodes selected
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Multi-selection
                  </p>
                </>
              ) : singleNode ? (
                <div className="flex items-center gap-2">
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', getNodeStyle(singleNode.type))}>
                    {(() => {
                      const Icon = getNodeIcon(singleNode.type)!
                      return <Icon className="h-3.5 w-3.5" />
                    })()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold leading-tight">
                      {singleNode.label}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {singleNode.type || 'Unknown type'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="max-h-80">
            <div className="space-y-3 px-4 py-3">
              {isMulti ? (
                /* Multi-select list */
                <div className="space-y-1">
                  {nodes.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => navigate(ROUTES.ENTITY.replace(':id', n.id))}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/50"
                    >
                      <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', getNodeStyle(n.type))}>
                        {(() => {
                          const Icon = getNodeIcon(n.type)!
                          return <Icon className="h-3 w-3" />
                        })()}
                      </div>
                      <span className="min-w-0 flex-1 truncate font-medium">{n.label}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                    </button>
                  ))}
                  {nodes.length > 20 && (
                    <p className="text-center text-[10px] text-muted-foreground py-1">
                      +{nodes.length - 20} more nodes
                    </p>
                  )}
                </div>
              ) : singleNode ? (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Connections', value: connectedEdges.length, icon: Network },
                      { label: 'Incoming', value: incomingEdges.length, icon: ArrowRight },
                      { label: 'Outgoing', value: outgoingEdges.length, icon: ExternalLink },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-md bg-muted/50 p-2 text-center">
                        <stat.icon className="mx-auto mb-0.5 h-3 w-3 text-muted-foreground" />
                        <p className="text-sm font-bold tabular-nums">{stat.value}</p>
                        <p className="text-[8px] text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Edge types */}
                  {connectedEdges.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Connections
                      </p>
                      <div className="space-y-1">
                        {connectedEdges.slice(0, 10).map((edge) => {
                          const isOutgoing = edge.source === singleNode.id
                          const connectedNodeId = isOutgoing ? edge.target : edge.source
                          const connectedTitle = getConnectedNodeTitle(connectedNodeId)
                          return (
                            <button
                              key={edge.id}
                              onClick={() => navigate(ROUTES.ENTITY.replace(':id', connectedNodeId))}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/50"
                            >
                              <Badge
                                variant="outline"
                                className="shrink-0 text-[8px] px-1 py-0 h-3.5"
                              >
                                {edge.label}
                              </Badge>
                              <span className="truncate text-muted-foreground">
                                {isOutgoing ? '→' : '←'}
                              </span>
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {connectedTitle}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                            </button>
                          )
                        })}
                        {connectedEdges.length > 10 && (
                          <p className="text-center text-[10px] text-muted-foreground py-1">
                            +{connectedEdges.length - 10} more connections
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {connectedEdges.length === 0 && (
                    <div className="flex flex-col items-center py-4 text-center">
                      <Network className="mb-2 h-6 w-6 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">No connections</p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </ScrollArea>

          {/* Footer */}
          {singleNode && (
            <div className="border-t px-4 py-2.5">
              <Button
                size="sm"
                className="w-full"
                onClick={() => navigate(ROUTES.ENTITY.replace(':id', singleNode.id))}
              >
                Open Entity
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </Button>
            </div>
          )}
          {isMulti && (
            <div className="border-t px-4 py-2.5">
              <p className="text-center text-[10px] text-muted-foreground">
                Click a node to view its details
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
