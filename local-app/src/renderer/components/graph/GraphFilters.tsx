import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, Check, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { GraphNode, GraphEdge } from '@shared/types'

interface GraphFiltersProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  activeNodeTypes: Set<string>
  activeEdgeTypes: Set<string>
  onToggleNodeType: (type: string) => void
  onToggleEdgeType: (type: string) => void
  onShowAll: () => void
  onHideAll: () => void
  className?: string
}

const TYPE_COLORS: Record<string, string> = {
  entity: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
  tag: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  default: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
}

function getTypeColor(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.default
}

export function GraphFilters({
  nodes,
  edges,
  activeNodeTypes,
  activeEdgeTypes,
  onToggleNodeType,
  onToggleEdgeType,
  onShowAll,
  onHideAll,
  className,
}: GraphFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const nodeTypes = useMemo(() => {
    const map = new Map<string, number>()
    nodes.forEach((n) => {
      map.set(n.type, (map.get(n.type) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [nodes])

  const edgeTypes = useMemo(() => {
    const map = new Map<string, number>()
    edges.forEach((e) => {
      map.set(e.label, (map.get(e.label) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [edges])

  const activeFilterCount = activeNodeTypes.size + activeEdgeTypes.size

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="default" className="ml-0.5 h-4 min-w-[16px] px-1 text-[9px]">
            {activeFilterCount}
          </Badge>
        )}
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border bg-background shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-xs font-semibold">Filters</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onShowAll}>
                  <Eye className="mr-1 h-3 w-3" />
                  Show all
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onHideAll}>
                  <EyeOff className="mr-1 h-3 w-3" />
                  Hide all
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-80">
              <div className="p-3 space-y-4">
                {/* Node Types */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Node Types
                    </p>
                    <Badge variant="secondary" className="h-4 text-[9px] px-1.5">
                      {nodeTypes.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {nodeTypes.map(([type, count]) => {
                      const isActive = activeNodeTypes.has(type)
                      return (
                        <button
                          key={type}
                          onClick={() => onToggleNodeType(type)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-all',
                            isActive
                              ? 'bg-primary/5 text-foreground'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                              isActive ? getTypeColor(type) : 'border-muted bg-muted/30'
                            )}
                          >
                            {isActive && <Check className="h-3 w-3" />}
                          </div>
                          <span className="min-w-0 flex-1 capitalize">{type}</span>
                          <Badge
                            variant="secondary"
                            className="h-4 min-w-[24px] justify-center px-1 text-[9px] tabular-nums"
                          >
                            {count}
                          </Badge>
                        </button>
                      )
                    })}
                    {nodeTypes.length === 0 && (
                      <p className="py-3 text-center text-[11px] text-muted-foreground">
                        No node types
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Edge Types */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Edge Types
                    </p>
                    <Badge variant="secondary" className="h-4 text-[9px] px-1.5">
                      {edgeTypes.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {edgeTypes.map(([type, count]) => {
                      const isActive = activeEdgeTypes.has(type)
                      return (
                        <button
                          key={type}
                          onClick={() => onToggleEdgeType(type)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-all',
                            isActive
                              ? 'bg-primary/5 text-foreground'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                              isActive ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-muted/30'
                            )}
                          >
                            {isActive && <Check className="h-3 w-3" />}
                          </div>
                          <span className="min-w-0 flex-1 font-mono text-[11px]">{type}</span>
                          <Badge
                            variant="secondary"
                            className="h-4 min-w-[24px] justify-center px-1 text-[9px] tabular-nums"
                          >
                            {count}
                          </Badge>
                        </button>
                      )
                    })}
                    {edgeTypes.length === 0 && (
                      <p className="py-3 text-center text-[11px] text-muted-foreground">
                        No edge types
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Summary footer */}
            <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                Showing {activeNodeTypes.size}/{nodeTypes.length} node types
              </span>
              <span>
                {activeEdgeTypes.size}/{edgeTypes.length} edge types
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
