import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Bell,
  MessageSquare,
  AtSign,
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Link2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { VirtualList } from '@/components/common/VirtualList'
import { EmptyState } from '@/components/common/EmptyState'
import { useStore } from '@/store'
import { useNotifications, useDismissNotification } from '@/hooks/useNotifications'
import { ROUTES } from '@/router'
import { api } from '@lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Notification, NotificationType } from '@shared/types'

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Bell; color: string; badgeClass: string; label: string }
> = {
  mention: {
    icon: AtSign,
    color: 'text-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    label: 'Mention',
  },
  comment: {
    icon: MessageSquare,
    color: 'text-green-500',
    badgeClass: 'bg-green-500/10 text-green-500 border-green-500/20',
    label: 'Comment',
  },
  update: {
    icon: FileText,
    color: 'text-yellow-500',
    badgeClass: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    label: 'Update',
  },
  invite: {
    icon: AtSign,
    color: 'text-purple-500',
    badgeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    label: 'Invite',
  },
  entity_update: {
    icon: FileText,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    label: 'Entity Update',
  },
  relation_created: {
    icon: Link2,
    color: 'text-cyan-500',
    badgeClass: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    label: 'Relation Created',
  },
  backup_complete: {
    icon: Check,
    color: 'text-green-400',
    badgeClass: 'bg-green-400/10 text-green-400 border-green-400/20',
    label: 'Backup Complete',
  },
  sync_conflict: {
    icon: AlertCircle,
    color: 'text-red-500',
    badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20',
    label: 'Sync Conflict',
  },
  system: {
    icon: AlertCircle,
    color: 'text-gray-500',
    badgeClass: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    label: 'System',
  },
}

const ALL_TYPES: NotificationType[] = Object.keys(TYPE_CONFIG) as NotificationType[]

export default function NotificationsCenter() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)

  const {
    data: notifications,
    isLoading,
  } = useNotifications(activeWorkspaceId ?? undefined)

  const dismissMutation = useDismissNotification()
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')

  const handleDismiss = useCallback(
    (notification: Notification) => {
      dismissMutation.mutate(notification.id)
    },
    [dismissMutation],
  )

  const items = useMemo(() => notifications ?? [], [notifications])
  const unreadCount = items.filter((n) => !n.is_read).length

  const handleMarkAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.is_read)
    for (const n of unread) {
      await api.notifications.markRead(n.id)
    }
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [queryClient, items])

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      handleDismiss(notification)
      if (notification.entity_id) {
        navigate(ROUTES.ENTITY.replace(':id', notification.entity_id))
      }
    },
    [navigate, handleDismiss],
  )

  useEffect(() => {
    const cleanup = window.gnovium?.notifications?.onReceived?.(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [queryClient])

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return items
    return items.filter((n) => n.type === typeFilter)
  }, [items, typeFilter])

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<NotificationType | 'all', number>> = { all: items.length }
    for (const n of items) {
      counts[n.type] = (counts[n.type] ?? 0) + 1
    }
    return counts
  }, [items])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col p-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stay updated with activity and sync notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="h-8 text-xs">
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
          {unreadCount > 0 && (
            <Badge variant="default" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>

      {/* Type filter chips */}
      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all',
              typeFilter === 'all'
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
            )}
          >
            All
            <span className="text-[10px] opacity-60">({typeCounts.all ?? 0})</span>
          </button>
          {ALL_TYPES.filter((t) => (typeCounts[t] ?? 0) > 0).map((type) => {
            const config = TYPE_CONFIG[type]
            const Icon = config.icon
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all',
                  typeFilter === type
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                )}
              >
                <Icon className={cn('h-3 w-3', typeFilter === type ? 'text-primary' : config.color)} />
                {config.label}
                <span className="text-[10px] opacity-60">({typeCounts[type]})</span>
              </button>
            )
          })}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border p-4"
            >
              <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6 text-muted-foreground" />}
          title="All caught up"
          description="No new notifications. Activity and sync updates will appear here."
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6 text-muted-foreground" />}
          title="No notifications in this category"
          description={typeFilter === 'all' ? 'No notifications found.' : `No ${TYPE_CONFIG[typeFilter]?.label ?? ''} notifications found. Try selecting a different filter.`}
        />
      ) : (
        <div className="flex-1 overflow-hidden">
          <VirtualList
            items={filteredItems}
            height="100%"
            estimateSize={88}
            gap={8}
            renderItem={({ item: notification }) => {
              const config = TYPE_CONFIG[notification.type]
              const Icon = config.icon
              return (
                <div
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                    'hover:bg-accent/50 hover:border-accent-foreground/20',
                    !notification.is_read && 'bg-accent/20 border-primary/20',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      notification.is_read ? 'bg-muted' : 'bg-primary/10',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        notification.is_read
                          ? 'text-muted-foreground'
                          : config.color,
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'truncate text-sm',
                          notification.is_read
                            ? 'font-normal'
                            : 'font-medium',
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', config.badgeClass)}
                      >
                        {config.label}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {notification.is_read && (
                      <Check className="h-4 w-4 text-muted-foreground/50" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(notification) }}
                      className="rounded p-1 text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            }}
          />
        </div>
      )}
    </motion.div>
  )
}
