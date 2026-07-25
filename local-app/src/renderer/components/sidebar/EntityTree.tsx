import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEntities, useEntityTypes } from '@/hooks/useEntity'
import { useStore } from '@/store'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { Entity, EntityType } from '@shared/types/entity'

interface GroupedEntities {
  type: EntityType | { id: null; name: string }
  entities: Entity[]
}

function groupEntities(
  entities: Entity[],
  types: EntityType[] | undefined
): GroupedEntities[] {
  const typeMap = new Map<string, EntityType>()
  if (types) {
    for (const t of types) {
      typeMap.set(t.id, t)
    }
  }

  const grouped = new Map<string, Entity[]>()

  for (const entity of entities) {
    const typeId = entity.entity_type_id ?? '__ungrouped__'
    const arr = grouped.get(typeId) ?? []
    arr.push(entity)
    grouped.set(typeId, arr)
  }

  const result: GroupedEntities[] = []
  for (const [typeId, ents] of grouped) {
    if (typeId === '__ungrouped__') {
      result.push({
        type: { id: null, name: 'Uncategorized' },
        entities: ents,
      })
    } else {
      const entityType = typeMap.get(typeId)
      result.push({
        type: entityType ?? { id: typeId, name: 'Unknown Type', workspace_id: '', icon: null, config: null, is_deleted: false, deleted_at: null, deleted_by: null, created_at: '' },
        entities: ents,
      })
    }
  }

  return result
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
      ))}
    </div>
  )
}

export function EntityTree() {
  const navigate = useNavigate()
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const [search, setSearch] = useState('')
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())

  const { data: entitiesData, isLoading: entitiesLoading } = useEntities()
  const { data: typesData } = useEntityTypes()

  const entities = useMemo(() => {
    if (!entitiesData) return []
    return Array.isArray(entitiesData) ? entitiesData : (entitiesData as { data?: Entity[] }).data ?? []
  }, [entitiesData])

  const types = useMemo(() => {
    if (!typesData) return undefined
    return Array.isArray(typesData) ? typesData : (typesData as { data?: EntityType[] }).data ?? undefined
  }, [typesData])

  const grouped = useMemo(() => {
    const filtered = search.trim()
      ? entities.filter((e) =>
          e.title.toLowerCase().includes(search.toLowerCase())
        )
      : entities
    return groupEntities(filtered, types)
  }, [entities, types, search])

  const toggleType = (typeId: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return next
    })
  }

  if (!sidebarOpen) return null

  if (entitiesLoading) {
    return (
      <div className="mt-2 border-t border-sidebar-border pt-2">
        <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
          Entities
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (entities.length === 0) {
    return (
      <div className="mt-2 border-t border-sidebar-border pt-2">
        <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
          Entities
        </div>
        <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
          <FolderOpen className="h-5 w-5 text-sidebar-foreground/30" />
          <p className="text-xs text-sidebar-foreground/40">No entities yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 border-t border-sidebar-border pt-2">
      <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
        Entities
      </div>

      {/* Search */}
      <div className="px-2 pb-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-sidebar-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter entities..."
            className={cn(
              'w-full rounded-md bg-sidebar-accent/50 py-1 pl-7 pr-6 text-xs',
              'text-sidebar-foreground placeholder:text-sidebar-foreground/40',
              'border border-transparent hover:border-sidebar-border focus:border-sidebar-border',
              'outline-none transition-colors'
            )}
            aria-label="Filter entities"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-sidebar-accent"
            >
              <X className="h-3 w-3 text-sidebar-foreground/40" />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-0.5 px-1 pb-2">
        {grouped.length === 0 && (
          <p className="px-2 py-2 text-xs text-sidebar-foreground/40">
            No matching entities
          </p>
        )}
        {grouped.map((group) => {
          const typeId = group.type.id ?? '__ungrouped__'
          const isExpanded = expandedTypes.has(typeId)
          return (
            <div key={typeId}>
              <button
                onClick={() => toggleType(typeId)}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs',
                  'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  'transition-colors duration-100'
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-sidebar-foreground/40" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-sidebar-foreground/40" />
                )}
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                <span className="flex-1 truncate font-medium">
                  {group.type.name}
                </span>
                <Badge
                  variant="secondary"
                  className="ml-auto h-4 min-w-4 justify-center px-1 text-[10px]"
                >
                  {group.entities.length}
                </Badge>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="ml-3 space-y-0.5 border-l border-sidebar-border pl-2">
                      {group.entities.map((entity) => (
                        <button
                          key={entity.id}
                          onClick={() => navigate(`/entity/${entity.id}`)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs',
                            'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                            'transition-colors duration-100'
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
                          <span className="flex-1 truncate">{entity.title}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
