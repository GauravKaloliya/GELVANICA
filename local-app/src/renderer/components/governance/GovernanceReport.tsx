import { motion } from 'framer-motion'
import { Shield, AlertTriangle, Link2, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn, formatDate } from '@/lib/utils'

interface GovernanceReportProps {
  healthScore: number
  entityCount: number
  duplicateCount: number
  orphanCount: number
  staleCount: number
  lastCalculated?: string
  previousScore?: number
}

function TrendIcon({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null
  const diff = current - previous
  if (diff > 5) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
  if (diff < -5) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
}

export function GovernanceReport({
  healthScore,
  entityCount,
  duplicateCount,
  orphanCount,
  staleCount,
  lastCalculated,
  previousScore,
}: GovernanceReportProps) {
  const totalIssues = duplicateCount + orphanCount + staleCount
  const healthyEntities = Math.max(0, entityCount - totalIssues)

  const issues = [
    {
      label: 'Duplicates',
      count: duplicateCount,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      description: 'Similar entities that could be merged',
    },
    {
      label: 'Orphans',
      count: orphanCount,
      icon: Link2,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      description: 'Entities with no incoming or outgoing relations',
    },
    {
      label: 'Stale Content',
      count: staleCount,
      icon: Clock,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      description: 'Entities not updated in over 30 days',
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Governance Report
          </CardTitle>
          {lastCalculated && (
            <Badge variant="outline" className="text-[10px]">
              Last checked: {formatDate(lastCalculated)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score summary row */}
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-4xl font-bold tabular-nums',
                healthScore >= 80 ? 'text-emerald-500' : healthScore >= 60 ? 'text-amber-500' : 'text-red-500'
              )}
            >
              {healthScore}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <TrendIcon current={healthScore} previous={previousScore} />
          </div>
          <div className="flex-1">
            <Progress value={healthScore} className="h-2.5" />
          </div>
        </div>

        <Separator />

        {/* Issue breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Issue Breakdown</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {issues.map((issue, i) => (
              <motion.div
                key={issue.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md', issue.bg)}>
                  <issue.icon className={cn('h-4 w-4', issue.color)} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-lg font-bold tabular-nums', issue.color)}>
                      {issue.count}
                    </p>
                    <span className="text-xs text-muted-foreground">{issue.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {issue.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total entities</span>
          <span className="font-medium">{entityCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Healthy entities</span>
          <span className="font-medium text-emerald-500">{healthyEntities}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Issues to resolve</span>
          <span className={cn('font-medium', totalIssues > 0 ? 'text-amber-500' : 'text-emerald-500')}>
            {totalIssues}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
