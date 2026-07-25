import { motion } from 'framer-motion'
import {
  FileText,
  Layers,
  GitBranch,
  MessageSquare,
  Archive,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Stat {
  label: string
  value: number
  icon: LucideIcon
  color: string
  bgColor: string
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
}

const ICON_MAP: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  entities: { icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  blocks: { icon: Layers, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  relations: { icon: GitBranch, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  comments: { icon: MessageSquare, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  archived: { icon: Archive, color: 'text-muted-foreground', bgColor: 'bg-muted/50' },
}

function TrendIndicator({ trend, value }: { trend?: 'up' | 'down' | 'flat'; value?: string }) {
  if (!trend || !value) return null
  const icons = {
    up: TrendingUp,
    down: TrendingDown,
    flat: Minus,
  }
  const colors = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    flat: 'text-muted-foreground',
  }
  const Icon = icons[trend]
  return (
    <Badge variant="secondary" className={cn('h-4 gap-0.5 px-1 text-[9px]', colors[trend])}>
      <Icon className="h-2.5 w-2.5" />
      {value}
    </Badge>
  )
}

export function StatsCards({
  overview,
  isLoading,
}: {
  overview?: {
    entity_count: number
    block_count: number
    relation_count: number
    comment_count: number
    archived_count: number
  }
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!overview) return null

  const stats: Stat[] = [
    {
      label: 'Entities',
      value: overview.entity_count,
      icon: ICON_MAP.entities!.icon,
      color: ICON_MAP.entities!.color,
      bgColor: ICON_MAP.entities!.bgColor,
    },
    {
      label: 'Blocks',
      value: overview.block_count,
      icon: ICON_MAP.blocks!.icon,
      color: ICON_MAP.blocks!.color,
      bgColor: ICON_MAP.blocks!.bgColor,
    },
    {
      label: 'Relations',
      value: overview.relation_count,
      icon: ICON_MAP.relations!.icon,
      color: ICON_MAP.relations!.color,
      bgColor: ICON_MAP.relations!.bgColor,
    },
    {
      label: 'Comments',
      value: overview.comment_count,
      icon: ICON_MAP.comments!.icon,
      color: ICON_MAP.comments!.color,
      bgColor: ICON_MAP.comments!.bgColor,
    },
    {
      label: 'Archived',
      value: overview.archived_count,
      icon: ICON_MAP.archived!.icon,
      color: ICON_MAP.archived!.color,
      bgColor: ICON_MAP.archived!.bgColor,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
        >
          <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
            {/* Subtle hover gradient */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold tabular-nums tracking-tight">
                  {stat.value.toLocaleString()}
                </p>
                <TrendIndicator trend={stat.trend} value={stat.trendValue} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Total {stat.label.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
