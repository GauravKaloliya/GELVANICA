import { useMemo } from 'react'
import { HardDrive } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatBytes } from '@/lib/utils'
import type { GnoviumFile } from '@shared/types'

const STORAGE_WARNING_THRESHOLD = 80
const STORAGE_CRITICAL_THRESHOLD = 95

function StorageBar({
  used,
  total,
  label,
  color,
  className,
}: {
  used: number
  total: number
  label: string
  color: string
  className?: string
}) {
  const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatBytes(used)}</span>
      </div>
      <div className="relative">
        <Progress value={percent} className="h-2" />
        <div
          className={cn('absolute inset-0 h-2 rounded-full opacity-30', color)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-right">
        {formatBytes(used)} of {formatBytes(total)}
      </p>
    </div>
  )
}

export function StorageIndicator({
  files,
  isLoading,
  maxStorageBytes = 1024 * 1024 * 1024, // 1 GB default
}: {
  files?: GnoviumFile[]
  isLoading?: boolean
  maxStorageBytes?: number
}) {
  const stats = useMemo(() => {
    if (!files) return { totalSize: 0, count: 0, byType: {} as Record<string, number> }

    let totalSize = 0
    const byType: Record<string, number> = {}

    for (const file of files) {
      totalSize += file.file_size
      const category = file.mime_type.split('/')[0] ?? 'other'
      byType[category] = (byType[category] ?? 0) + file.file_size
    }

    return { totalSize, count: files.length, byType }
  }, [files])

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>
    )
  }

  const percent = maxStorageBytes > 0 ? (stats.totalSize / maxStorageBytes) * 100 : 0
  const isWarning = percent >= STORAGE_WARNING_THRESHOLD
  const isCritical = percent >= STORAGE_CRITICAL_THRESHOLD

  const topTypes = Object.entries(stats.byType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  const typeColors: Record<string, string> = {
    image: 'bg-emerald-500',
    video: 'bg-purple-500',
    audio: 'bg-amber-500',
    text: 'bg-blue-500',
    application: 'bg-orange-500',
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            isCritical
              ? 'bg-destructive/10 text-destructive'
              : isWarning
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-primary/10 text-primary'
          )}
        >
          <HardDrive className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Storage</p>
          <p className="text-[11px] text-muted-foreground">
            {stats.count} file{stats.count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Main bar */}
      <StorageBar
        used={stats.totalSize}
        total={maxStorageBytes}
        label="Total Usage"
        color={isCritical ? 'bg-destructive' : isWarning ? 'bg-amber-500' : 'bg-primary'}
      />

      {/* Warning */}
      {isCritical && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Storage is almost full. Consider deleting unused files.
        </div>
      )}

      {/* Breakdown by type */}
      {topTypes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">By Type</p>
          {topTypes.map(([type, size]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', typeColors[type] ?? 'bg-muted-foreground')} />
              <span className="flex-1 text-xs capitalize text-muted-foreground">{type}</span>
              <span className="text-xs font-medium">{formatBytes(size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
