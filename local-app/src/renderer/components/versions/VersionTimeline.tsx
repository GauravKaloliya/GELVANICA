import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GitCommit, Clock, RotateCcw, ChevronDown, ChevronRight, User, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { VirtualList } from '@/components/common/VirtualList'
import { useEntityVersions, useRestoreVersion } from '@/hooks/useVersions'
import { ROUTES } from '@/router'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Version } from '@shared/types'

export function VersionTimeline({
  entityId,
  onVersionClick,
}: {
  entityId: string
  onVersionClick?: (version: Version) => void
}) {
  const navigate = useNavigate()
  const { data: versionsData, isLoading } = useEntityVersions(entityId)
  const restoreVersion = useRestoreVersion()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const versions = ((versionsData as { data?: unknown })?.data ?? []) as Version[]

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No versions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Versions appear as you make changes.
        </p>
      </div>
    )
  }

  return (
    <VirtualList
      items={versions}
      height="100%"
      estimateSize={56}
      overscan={5}
      gap={4}
      renderItem={({ item: version, index: i }) => {
        const isLatest = i === 0
        const isExpanded = expandedId === version.id

        return (
          <div className="relative pl-[58px]">
            {/* Timeline dot */}
            <div
              className={cn(
                'absolute left-[16px] top-3 z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full border-2',
                isLatest
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground'
              )}
            >
              {isLatest ? (
                <GitCommit className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold">{version.version_number}</span>
              )}
            </div>

            {/* Content */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : version.id)}
              className={cn(
                'flex w-full items-start justify-between rounded-lg p-3 text-left transition-colors',
                'hover:bg-muted/50',
                isExpanded && 'bg-muted/30'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    v{version.version_number}
                  </p>
                  {isLatest && (
                    <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                      Latest
                    </Badge>
                  )}
                  {version.branch_name && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                      <GitBranch className="mr-0.5 h-2.5 w-2.5" />
                      {version.branch_name}
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelativeTime(version.created_at)}
                  {version.author_name && (
                    <>
                      <span>·</span>
                      <User className="h-2.5 w-2.5" />
                      {version.author_name}
                    </>
                  )}
                </div>
              </div>

              {isExpanded ? (
                <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>

            {/* Expanded details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pb-3 pr-3">
                    {version.description && (
                      <p className="text-xs text-muted-foreground">{version.description}</p>
                    )}
                    {version.changeset_summary && (
                      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        {version.changeset_summary}
                      </div>
                    )}
                    {version.stats && (
                      <div className="flex gap-2">
                        {version.stats.additions !== undefined && (
                          <Badge variant="outline" className="text-[10px] text-emerald-500">
                            +{version.stats.additions}
                          </Badge>
                        )}
                        {version.stats.deletions !== undefined && (
                          <Badge variant="outline" className="text-[10px] text-red-500">
                            -{version.stats.deletions}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      {!isLatest && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            restoreVersion.mutate(version.id)
                          }}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Restore
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onVersionClick) onVersionClick(version)
                          else navigate(ROUTES.DIFF.replace(':id', version.id))
                        }}
                      >
                        View Diff
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      }}
    />
  )
}
