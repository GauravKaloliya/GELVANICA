import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  AlertTriangle,
  Link2,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/router'
import { cn } from '@/lib/utils'

interface GovernanceHealthProps {
  healthScore?: number
  duplicateCount?: number
  orphanCount?: number
  staleCount?: number
  entityCount?: number
  isLoading: boolean
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500/10'
  if (score >= 60) return 'bg-amber-500/10'
  return 'bg-red-500/10'
}

function scoreLabel(score: number) {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 40) return 'Poor'
  return 'Critical'
}

export function GovernanceHealth({
  healthScore,
  duplicateCount = 0,
  orphanCount = 0,
  staleCount = 0,
  entityCount = 0,
  isLoading,
}: GovernanceHealthProps) {
  const navigate = useNavigate()
  const totalIssues = duplicateCount + orphanCount + staleCount
  const healthyEntities = Math.max(0, entityCount - totalIssues)
  const hasIssues = totalIssues > 0

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Governance Health</CardTitle>
          {!isLoading && healthScore !== undefined && (
            <Badge
              variant="secondary"
              className={cn('h-4 text-[9px] px-1.5', scoreColor(healthScore))}
            >
              {scoreLabel(healthScore)}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={() => navigate(ROUTES.GOVERNANCE)}
        >
          Details
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        ) : healthScore !== undefined ? (
          <div className="space-y-4">
            {/* Score row */}
            <div className="flex items-center gap-4">
              {/* Mini score ring */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  'relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full',
                  scoreBg(healthScore)
                )}
              >
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className={cn(
                      healthScore >= 80 ? 'text-emerald-500' : healthScore >= 60 ? 'text-amber-500' : 'text-red-500'
                    )}
                    strokeDasharray={2 * Math.PI * 28}
                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - healthScore / 100) }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <span className={cn('text-lg font-bold tabular-nums z-10', scoreColor(healthScore))}>
                  {healthScore}
                </span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {hasIssues ? `${totalIssues} issues to resolve` : 'All clear!'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {healthyEntities} of {entityCount} entities healthy
                </p>
                <Progress value={healthScore} className="mt-2 h-1.5" />
              </div>
            </div>

            {/* Issue breakdown */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'Duplicates',
                  value: duplicateCount,
                  icon: AlertTriangle,
                  color: 'text-amber-500',
                  bgColor: 'bg-amber-500/8',
                },
                {
                  label: 'Orphans',
                  value: orphanCount,
                  icon: Link2,
                  color: 'text-orange-500',
                  bgColor: 'bg-orange-500/8',
                },
                {
                  label: 'Stale',
                  value: staleCount,
                  icon: Clock,
                  color: 'text-red-500',
                  bgColor: 'bg-red-500/8',
                },
              ].map((issue) => (
                <div
                  key={issue.label}
                  className={cn(
                    'flex items-center gap-2 rounded-lg p-2.5 transition-colors',
                    issue.value > 0 ? issue.bgColor : 'bg-muted/30'
                  )}
                >
                  <issue.icon
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      issue.value > 0 ? issue.color : 'text-muted-foreground/50'
                    )}
                  />
                  <div className="min-w-0">
                    <p className={cn('text-sm font-bold tabular-nums', issue.value > 0 ? issue.color : 'text-muted-foreground')}>
                      {issue.value}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{issue.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
              <Shield className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">No governance data</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run a health check to see your governance score.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => navigate(ROUTES.GOVERNANCE)}
            >
              Go to Governance
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
