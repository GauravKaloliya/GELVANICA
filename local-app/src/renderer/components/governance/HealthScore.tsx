import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function scoreGlow(score: number) {
  if (score >= 80) return 'shadow-emerald-500/20'
  if (score >= 60) return 'shadow-amber-500/20'
  return 'shadow-red-500/20'
}

function scoreLabel(score: number) {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 40) return 'Poor'
  return 'Critical'
}

export function HealthScore({
  score,
  entityCount,
  duplicateCount,
  orphanCount,
  staleCount,
  isRecalculating,
  onRecalculate,
}: {
  score: number | undefined
  entityCount?: number
  duplicateCount?: number
  orphanCount?: number
  staleCount?: number
  isRecalculating?: boolean
  onRecalculate?: () => void
}) {
  if (score === undefined) {
    return (
      <div className="flex flex-col items-center py-8">
        <Skeleton className="mb-4 h-[120px] w-[120px] rounded-full" />
        <Skeleton className="mb-2 h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  const stats = [
    { label: 'Entities', value: entityCount ?? 0, color: 'text-foreground' },
    { label: 'Duplicates', value: duplicateCount ?? 0, color: 'text-amber-500' },
    { label: 'Orphans', value: orphanCount ?? 0, color: 'text-orange-500' },
    { label: 'Stale', value: staleCount ?? 0, color: 'text-red-500' },
  ]

  return (
    <div className="flex flex-col items-center">
      {/* Score ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          'relative flex h-[120px] w-[120px] items-center justify-center rounded-full shadow-lg',
          scoreGlow(score)
        )}
      >
        {/* Background ring via SVG */}
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            className={cn(
              score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500'
            )}
            strokeDasharray={2 * Math.PI * 54}
            initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - score / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>

        <div className="flex flex-col items-center z-10">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={cn('text-3xl font-bold tabular-nums', scoreColor(score))}
          >
            {score}
          </motion.span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </motion.div>

      {/* Label */}
      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={cn('mt-3 text-sm font-medium', scoreColor(score))}
      >
        {scoreLabel(score)}
      </motion.p>

      {/* Stats */}
      <div className="mt-6 grid w-full grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="rounded-lg bg-muted/50 p-3 text-center"
          >
            <p className={cn('text-lg font-bold tabular-nums', stat.color)}>
              {stat.value}
            </p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-4 w-full"
      >
        <Progress value={score} className="h-2" />
      </motion.div>

      {/* Recalculate button */}
      {onRecalculate && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRecalculate}
          disabled={isRecalculating}
        >
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isRecalculating && 'animate-spin')} />
          {isRecalculating ? 'Recalculating...' : 'Recalculate'}
        </Button>
      )}
    </div>
  )
}
