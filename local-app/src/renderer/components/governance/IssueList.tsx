import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Link2, Clock, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IssueCard } from './IssueCard'
import type { DuplicateEntry, OrphanEntry, StaleEntry } from '@shared/types'

type IssueType = 'duplicate' | 'orphan' | 'stale'

const typeConfig: Record<IssueType, { icon: typeof AlertTriangle; label: string; color: string }> = {
  duplicate: { icon: AlertTriangle, label: 'Duplicates', color: 'text-amber-500' },
  orphan: { icon: Link2, label: 'Orphans', color: 'text-orange-500' },
  stale: { icon: Clock, label: 'Stale Content', color: 'text-red-500' },
}

export function IssueList<T extends DuplicateEntry | OrphanEntry | StaleEntry>({
  type,
  items,
  isLoading,
  onAction,
}: {
  type: IssueType
  items: T[]
  isLoading?: boolean
  onAction?: (item: T, action: string) => void
}) {
  const config = typeConfig[type]

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No {config.label.toLowerCase()} found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {type === 'duplicate'
            ? 'No similar entities detected.'
            : type === 'orphan'
            ? 'All entities have at least one relation.'
            : 'All entities have been updated recently.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pb-2">
        <config.icon className={cn('h-4 w-4', config.color)} />
        <h3 className="text-sm font-medium">{config.label}</h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {items.length}
        </Badge>
      </div>
      <AnimatePresence initial={false}>
        {items.map((item, i) => (
          <motion.div
            key={type === 'duplicate' ? (item as DuplicateEntry).entity_a_id : (item as OrphanEntry).id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <IssueCard
              type={type}
              item={item}
              onAction={onAction ? (action) => onAction(item, action) : undefined}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
