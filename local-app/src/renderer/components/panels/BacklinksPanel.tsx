import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Network, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useBacklinks, useOutgoingRelations } from '@/hooks/useRelations'
import { ROUTES } from '@/router'
import { cn, truncate } from '@/lib/utils'
import type { Relation } from '@shared/types'

function BacklinkItem({
  relation,
  direction,
  onClick,
}: {
  relation: Relation
  direction: 'inbound' | 'outbound'
  onClick: () => void
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group flex w-full items-start gap-2.5 rounded-lg border border-transparent p-2.5 text-left transition-colors hover:border-border hover:bg-muted/50"
    >
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
          direction === 'inbound'
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-blue-500/10 text-blue-500'
        )}
      >
        {direction === 'inbound' ? (
          <ArrowLeft className="h-3 w-3" />
        ) : (
          <ArrowRight className="h-3 w-3" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
            {direction === 'inbound'
              ? (relation.source_entity_title ?? 'Untitled')
              : (relation.target_entity_title ?? 'Untitled')
            }
          </p>
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {relation.relation_type}
          </Badge>
          {relation.description && (
            <p className="text-xs text-muted-foreground truncate">
              {truncate(relation.description, 60)}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  )
}

export function BacklinksPanel({ entityId }: { entityId: string }) {
  const navigate = useNavigate()
  const { data: backlinksData, isLoading: backlinksLoading } = useBacklinks(entityId)
  const { data: outgoingData, isLoading: outgoingLoading } = useOutgoingRelations(entityId)

  const backlinks = ((backlinksData as { data?: Relation[] })?.data ?? []) as Relation[]
  const outgoing = ((outgoingData as { data?: Relation[] })?.data ?? []) as Relation[]
  const isLoading = backlinksLoading || outgoingLoading

  const totalLinks = backlinks.length + outgoing.length

  const handleNavigate = (entityId: string) => {
    navigate(ROUTES.ENTITY.replace(':id', entityId))
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-2 rounded-lg border p-2.5">
            <Skeleton className="h-6 w-6 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        {/* Outgoing Relations */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3" />
              Outgoing ({outgoing.length})
            </h4>
          </div>
          {outgoing.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No outgoing relations
            </p>
          ) : (
            <div className="space-y-1">
              {outgoing.map((rel) => (
                <BacklinkItem
                  key={rel.id}
                  relation={rel}
                  direction="outbound"
                  onClick={() => handleNavigate(rel.target_entity_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        {backlinks.length > 0 && outgoing.length > 0 && <Separator />}

        {/* Backlinks */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <ArrowLeft className="h-3 w-3" />
              Backlinks ({backlinks.length})
            </h4>
          </div>
          {backlinks.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No backlinks found
            </p>
          ) : (
            <div className="space-y-1">
              {backlinks.map((rel) => (
                <BacklinkItem
                  key={rel.id}
                  relation={rel}
                  direction="inbound"
                  onClick={() => handleNavigate(rel.source_entity_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {totalLinks > 0 && (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Network className="mb-1 inline h-3 w-3 mr-1" />
            This entity has {totalLinks} connection{totalLinks !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
