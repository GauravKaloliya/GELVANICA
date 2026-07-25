import { useNavigate } from 'react-router-dom'
import { Link2, Clock, ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ROUTES } from '@/router'
import { formatDate } from '@/lib/utils'
import type { DuplicateEntry, OrphanEntry, StaleEntry } from '@shared/types'

type IssueType = 'duplicate' | 'orphan' | 'stale'

export function IssueCard({
  type,
  item,
  onAction,
}: {
  type: IssueType
  item: DuplicateEntry | OrphanEntry | StaleEntry
  onAction?: (action: string) => void
}) {
  const navigate = useNavigate()
  const updatedAt = 'updated_at' in item ? item.updated_at : undefined

  return (
    <div
      className="group flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30"
    >
      <div className="min-w-0 flex-1">
        {/* Title */}
        <p className="text-sm font-medium truncate">{type === 'duplicate' ? (item as DuplicateEntry).title_a : (item as OrphanEntry).title}</p>

        {/* Subtitle */}
        {type === 'duplicate' && 'title_b' in item && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            Similar to: {(item as DuplicateEntry).title_b}
          </p>
        )}

        {/* Meta */}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {updatedAt && (
            <>
              <Clock className="h-2.5 w-2.5" />
              {formatDate(updatedAt)}
            </>
          )}
          {type === 'duplicate' && 'similarity' in item && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5">
              {Math.round((item as DuplicateEntry).similarity * 100)}% match
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
        {type === 'duplicate' && onAction && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onAction('merge')}
            title="Merge"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {type === 'orphan' && onAction && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onAction('relate')}
            title="Create relation"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {type === 'stale' && onAction && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onAction('archive')}
            title="Archive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(ROUTES.ENTITY.replace(':id', type === 'duplicate' ? (item as DuplicateEntry).entity_a_id : (item as OrphanEntry).id))}
          title="Open"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
