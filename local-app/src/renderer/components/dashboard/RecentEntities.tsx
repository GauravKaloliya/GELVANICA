import { useNavigate } from 'react-router-dom'
import {
  FileText,
  ArrowRight,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { VirtualList } from '@/components/common/VirtualList'
import { ROUTES } from '@/router'
import { formatRelativeTime } from '@/lib/utils'

interface Entity {
  id: string
  title: string
  updated_at: string
}

export function RecentEntities({
  entities,
  isLoading,
  onViewAll,
  onEdit,
  onDelete,
}: {
  entities?: Entity[]
  isLoading: boolean
  onViewAll?: () => void
  onEdit?: (entity: Entity) => void
  onDelete?: (entity: Entity) => void
}) {
  const navigate = useNavigate()

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Recent Entities</CardTitle>
          {!isLoading && entities && (
            <Badge variant="secondary" className="h-4 text-[9px] px-1.5">
              {entities.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={onViewAll ?? (() => navigate(ROUTES.SEARCH))}
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : entities && entities.length > 0 ? (
          <VirtualList
            items={entities}
            height={Math.min(entities.length * 48, 400)}
            estimateSize={48}
            overscan={5}
            gap={2}
            renderItem={({ item: entity }) => (
              <button
                key={entity.id}
                onClick={() => navigate(ROUTES.ENTITY.replace(':id', entity.id))}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
              >
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 transition-colors group-hover:bg-primary/15">
                  <FileText className="h-4 w-4 text-primary/70 transition-colors group-hover:text-primary" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                    {entity.title || 'Untitled'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {formatRelativeTime(entity.updated_at)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {onEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(entity) }}
                      className="rounded p-1 text-muted-foreground/50 hover:text-foreground hover:bg-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(entity) }}
                      className="rounded p-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
              </button>
            )}
          />
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <FileText className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">No entities yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
              Create your first entity to start building your knowledge base.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => navigate(ROUTES.DASHBOARD)}
            >
              Create entity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
