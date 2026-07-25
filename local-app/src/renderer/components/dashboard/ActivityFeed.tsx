import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Clock,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Link2,
  MessageSquare,
  GitBranch,
  Tag,
  Upload,
  Eye,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/router'
import { formatRelativeTime } from '@/lib/utils'

interface ActivityEntry {
  id: string
  action: string
  entity_id?: string
  entity_title?: string
  created_at: string
  user_name?: string
}

const ACTION_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; bgColor: string; label: string }
> = {
  create: { icon: Plus, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'Created' },
  update: { icon: Pencil, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Updated' },
  delete: { icon: Trash2, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Deleted' },
  relate: { icon: Link2, color: 'text-violet-500', bgColor: 'bg-violet-500/10', label: 'Related' },
  comment: { icon: MessageSquare, color: 'text-amber-500', bgColor: 'bg-amber-500/10', label: 'Commented' },
  branch: { icon: GitBranch, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', label: 'Branched' },
  tag: { icon: Tag, color: 'text-pink-500', bgColor: 'bg-pink-500/10', label: 'Tagged' },
  upload: { icon: Upload, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', label: 'Uploaded' },
  view: { icon: Eye, color: 'text-muted-foreground', bgColor: 'bg-muted/50', label: 'Viewed' },
  sync: { icon: RefreshCw, color: 'text-teal-500', bgColor: 'bg-teal-500/10', label: 'Synced' },
  default: { icon: Activity, color: 'text-muted-foreground', bgColor: 'bg-muted/50', label: 'Activity' },
}

function getActionConfig(action: string) {
  const key = action.toLowerCase().split(' ')[0] ?? ''
  return ACTION_CONFIG[key] ?? ACTION_CONFIG.default!
}

const ActivityFeed = React.memo(function ActivityFeed({
  activities,
  isLoading,
  onViewAll,
}: {
  activities?: ActivityEntry[]
  isLoading: boolean
  onViewAll?: () => void
}) {
  const navigate = useNavigate()

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Activity Feed</CardTitle>
          {!isLoading && activities && (
            <Badge variant="secondary" className="h-4 text-[9px] px-1.5">
              {activities.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={onViewAll ?? (() => navigate(ROUTES.ACTIVITY))}
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5">
                <Skeleton className="mt-0.5 h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="relative">
            {/* Vertical timeline connector */}
            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

            <AnimatePresence initial={false}>
              <div className="space-y-0.5">
                {activities.map((act, i) => {
                  const config = getActionConfig(act.action)
                  const Icon = config.icon

                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/30"
                    >
                      {/* Icon with background */}
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{config.label}</span>
                          {act.entity_title && (
                            <button
                              onClick={() => act.entity_id && navigate(ROUTES.ENTITY.replace(':id', act.entity_id))}
                              className="ml-1 text-primary hover:underline"
                            >
                              {act.entity_title}
                            </button>
                          )}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(act.created_at)}
                          {act.user_name && (
                            <>
                              <span className="text-muted-foreground/50">·</span>
                              <span>{act.user_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <Activity className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">No activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your activity feed will appear as you work.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

export default ActivityFeed
