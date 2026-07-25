import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { History } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useEntityVersions } from '@/hooks/useVersions'
import { useCompareDiffs } from '@/hooks/useDiffs'
import { BranchSelector } from '@/components/versions/BranchSelector'
import { VersionTimeline } from '@/components/versions/VersionTimeline'
import { ROUTES } from '@/router'
import type { Version } from '@shared/types'

export function HistoryPanel({ entityId }: { entityId: string }) {
  const navigate = useNavigate()
  const { data: versionsData, isLoading } = useEntityVersions(entityId)
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined)
  const blockDiffs = useCompareDiffs()

  const versions = useMemo(() => {
    const raw = ((versionsData as { data?: unknown })?.data ?? []) as Version[]
    return raw
  }, [versionsData])

  function handleVersionClick(version: Version) {
    const prevVersion = versions.find((v) => v.version_number === version.version_number - 1)
    if (prevVersion) {
      blockDiffs.mutate({
        left_version_id: prevVersion.id,
        right_version_id: version.id,
      })
    }
    navigate(ROUTES.DIFF.replace(':id', version.id))
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-2.5">
            <Skeleton className="h-[30px] w-[30px] rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <div className="mb-3">
          <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
        </div>
        {versions.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <History className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mb-1 text-sm font-medium">No version history</p>
            <p className="text-xs text-muted-foreground">
              Versions appear as you make changes.
            </p>
          </div>
        ) : (
          <VersionTimeline
            entityId={entityId}
            onVersionClick={handleVersionClick}
          />
        )}
      </div>
    </ScrollArea>
  )
}
