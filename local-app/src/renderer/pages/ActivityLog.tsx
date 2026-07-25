import { useCallback, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Filter,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { VirtualList } from '@/components/common/VirtualList'
import { EmptyState } from '@/components/common/EmptyState'
import { useActivityLog } from '@/hooks/useActivity'
import { useStore } from '@/store'
import { ROUTES } from '@/router'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Activity as ActivityItem } from '@shared/types'

const PAGE_SIZE = 50

const ACTION_ICONS: Record<string, typeof Activity> = {
  create: Plus,
  update: Edit3,
  delete: Trash2,
  archive: Trash2,
  restore: FileText,
  comment: FileText,
  merge: Activity,
}

function getActionIcon(action: string): typeof Activity {
  const lower = action.toLowerCase()
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return Activity
}

function getActionColor(action: string): string {
  const lower = action.toLowerCase()
  if (lower.includes('create') || lower.includes('add')) return 'text-green-500 bg-green-500/10'
  if (lower.includes('update') || lower.includes('edit') || lower.includes('modify')) return 'text-blue-500 bg-blue-500/10'
  if (lower.includes('delete') || lower.includes('remove') || lower.includes('archive')) return 'text-red-500 bg-red-500/10'
  if (lower.includes('comment')) return 'text-amber-500 bg-amber-500/10'
  if (lower.includes('merge')) return 'text-purple-500 bg-purple-500/10'
  return 'text-muted-foreground bg-muted'
}

function formatAction(action: string, details: Record<string, unknown> | null): string {
  const name = (details?.entity_title ?? details?.name) as string | undefined
  if (name) return `${action} "${name}"`
  return action
}

export default function ActivityLog() {
  const navigate = useNavigate()
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')

  const since = useMemo(() => {
    if (dateRange === 'all') return undefined
    const now = new Date()
    switch (dateRange) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      case 'week': return new Date(now.getTime() - 7 * 86400000).toISOString()
      case 'month': return new Date(now.getTime() - 30 * 86400000).toISOString()
      default: return undefined
    }
  }, [dateRange])

  const offset = (page - 1) * PAGE_SIZE

  const { data: activityData, isLoading } = useActivityLog(
    activeWorkspaceId ?? '',
    { per_page: PAGE_SIZE, page, since, action: actionFilter === 'all' ? undefined : actionFilter },
  )

  const activities: ActivityItem[] = activityData?.data ?? []
  const meta = activityData?.meta
  const totalItems = meta?.total
  const hasMore = totalItems != null ? offset + activities.length < totalItems : activities.length === PAGE_SIZE

  const handleEntityClick = useCallback(
    (entityId: string) => {
      navigate(ROUTES.ENTITY.replace(':id', entityId))
    },
    [navigate],
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col p-8"
    >
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Recent activity across your workspace
          {totalItems != null && (
            <span className="ml-1.5 text-xs text-muted-foreground/70">({totalItems.toLocaleString()} total)</span>
          )}
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(1) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
            <SelectItem value="comment">Comments</SelectItem>
          </SelectContent>
        </Select>
        {(dateRange !== 'all' || actionFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateRange('all'); setActionFilter('all'); setPage(1) }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 py-4">
              <div className="relative flex flex-col items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                {i < 7 && (
                  <div className="absolute top-9 bottom-0 w-px bg-border" />
                )}
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6 text-muted-foreground" />}
          title="No activity yet"
          description="Activity will appear here as you create, edit, and manage your knowledge base."
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-hidden">
            <VirtualList
              items={activities}
              height="100%"
              estimateSize={72}
              renderItem={({ item: activity }) => {
                const Icon = getActionIcon(activity.action)
                const colorClass = getActionColor(activity.action)
                return (
                  <div className="relative flex items-start gap-4 py-4 px-1">
                    <div
                      className={cn(
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background',
                        colorClass,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    <div
                      className={cn(
                        'min-w-0 flex-1 pt-1',
                        activity.entity_id && 'cursor-pointer',
                      )}
                      onClick={
                        activity.entity_id
                          ? () => handleEntityClick(activity.entity_id!)
                          : undefined
                      }
                    >
                      <p className="text-sm">
                        <span
                          className={cn(
                            'font-medium',
                            activity.entity_id &&
                              'text-primary hover:underline',
                          )}
                        >
                          {formatAction(activity.action, activity.details)}
                        </span>
                      </p>
                      {activity.details &&
                        Object.keys(activity.details).length > 0 &&
                        !('entity_title' in activity.details) &&
                        !('name' in activity.details) && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {JSON.stringify(activity.details)}
                          </p>
                        )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                )
              }}
            />
          </div>

          {hasMore && (
            <div className="flex shrink-0 justify-center border-t py-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
