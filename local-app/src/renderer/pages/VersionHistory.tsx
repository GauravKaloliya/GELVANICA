import { useState } from 'react'
import { motion } from 'framer-motion'
import { History, Camera, GitCompare, Loader2, RotateCcw, AlertTriangle, Layers, ChevronDown, ChevronRight } from 'lucide-react'
import { useStore } from '@/store'
import { useEntitySnapshot } from '@/hooks/useEntitySnapshot'
import { useCompareDiffs } from '@/hooks/useDiffs'
import { useEntityVersions, useRestoreVersion } from '@/hooks/useVersions'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { BranchSelector } from '@/components/versions/BranchSelector'
import { VersionTimeline } from '@/components/versions/VersionTimeline'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Version, BlockDiffFieldComparison, BlockDiffResponse } from '@shared/types'

interface VersionWithSnapshot extends Version {
  snapshot_id?: string
}
import { api } from '@lib/api'

function DiffDisplay({ diff }: { diff: Record<string, unknown> }) {
  if (!diff) return null
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
      <p className="font-medium mb-2">Diff Result</p>
      <div className="space-y-1 font-mono text-xs">
        {Object.entries(diff).map(([key, value]) => {
          if (key === 'left' || key === 'right') return null
          return (
            <div key={key} className="flex gap-2">
              <span className="text-muted-foreground min-w-[120px]">{key}:</span>
              <span>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}</span>
            </div>
          )
        })}
      </div>
      {'added' in diff && Array.isArray(diff.added) && diff.added.length > 0 && (
        <div>
          <p className="font-medium text-green-600 mt-2">Added</p>
          {(diff.added as string[]).map((item) => (
            <p key={item} className="text-xs text-green-600">+ {item}</p>
          ))}
        </div>
      )}
      {'removed' in diff && Array.isArray(diff.removed) && diff.removed.length > 0 && (
        <div>
          <p className="font-medium text-red-600 mt-2">Removed</p>
          {(diff.removed as string[]).map((item) => (
            <p key={item} className="text-xs text-red-600">- {item}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function SideBySideFieldDiff({
  left,
  right,
  field,
}: {
  left: unknown
  right: unknown
  field: string
}) {
  const leftStr =
    typeof left === 'object' ? JSON.stringify(left, null, 2) : String(left ?? '')
  const rightStr =
    typeof right === 'object' ? JSON.stringify(right, null, 2) : String(right ?? '')

  return (
    <div className="mb-2 rounded border bg-muted/20">
      <div className="flex items-center border-b bg-muted/30 px-3 py-1">
        <span className="text-xs font-medium text-muted-foreground">{field}</span>
      </div>
      <div className="grid grid-cols-2 divide-x">
        <div className="p-2">
          <p className="mb-1 px-1 text-xs font-medium text-red-500">Left</p>
          <pre className="max-h-40 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded bg-red-50/10 p-1 font-mono text-xs leading-relaxed text-red-300">
            {leftStr}
          </pre>
        </div>
        <div className="p-2">
          <p className="mb-1 px-1 text-xs font-medium text-green-500">Right</p>
          <pre className="max-h-40 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded bg-green-50/10 p-1 font-mono text-xs leading-relaxed text-green-300">
            {rightStr}
          </pre>
        </div>
      </div>
    </div>
  )
}

function BlockChangesCard({
  blockId,
  changes,
}: {
  blockId: string
  changes: Record<string, BlockDiffFieldComparison>
}) {
  const [isOpen, setIsOpen] = useState(true)
  const entries = Object.entries(changes)

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className="truncate text-sm font-medium" title={blockId}>{blockId}</span>
        <span className="ml-auto text-xs text-muted-foreground">{entries.length} field{entries.length !== 1 ? 's' : ''} changed</span>
      </button>
      {isOpen && (
        <div className="space-y-2 border-t px-4 py-3">
          {entries.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No fields changed</p>
          ) : (
            entries.map(([field, comparison]) => (
              <SideBySideFieldDiff
                key={field}
                field={field}
                left={comparison.left}
                right={comparison.right}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function BlockChangesView({
  diff,
}: {
  diff: Record<string, Record<string, BlockDiffFieldComparison>> | null
}) {
  if (!diff) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed p-6">
        <Layers className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No block-level changes</p>
      </div>
    )
  }

  const blockIds = Object.keys(diff)
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        {blockIds.length} block{blockIds.length > 1 ? 's' : ''} changed
      </p>
      {blockIds.filter((id) => diff[id]).map((blockId) => (
        <BlockChangesCard
          key={blockId}
          blockId={blockId}
          changes={diff[blockId]!}
        />
      ))}
    </div>
  )
}

function VersionsLoadingSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function VersionsError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
      <p className="text-sm font-medium text-destructive">Failed to load versions</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

export default function VersionHistory() {
  const activeEntityId = useStore((s) => s.activeEntityId)
  const versionFilter = useStore((s) => s.versionFilter)
  const setVersionFilter = useStore((s) => s.setVersionFilter)

  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [compareLeft, setCompareLeft] = useState<string>('')
  const [compareRight, setCompareRight] = useState<string>('')
  const [diffResult, setDiffResult] = useState<unknown>(null)
  const [viewMode, setViewMode] = useState<'entity' | 'block'>('entity')
  const [blockDiffResult, setBlockDiffResult] = useState<Record<string, Record<string, BlockDiffFieldComparison>> | null>(null)
  const createSnapshot = useEntitySnapshot()
  const compareDiffs = useCompareDiffs()
  const restoreVersion = useRestoreVersion()

  const { data: versionsData, isLoading: versionsLoading, error: versionsError } = useEntityVersions(activeEntityId ?? '')
  const versions = ((versionsData as { data?: unknown })?.data ?? []) as Version[]

  function handleCreateSnapshot() {
    if (!selectedVersion || !activeEntityId) return
    createSnapshot.mutate({
      entityId: activeEntityId,
      changesetId: selectedVersion.id,
    })
  }

  function handleCompare() {
    if (!compareLeft || !compareRight) return

    if (viewMode === 'block') {
      setBlockDiffResult(null)
      api.diffs.blocks({ left_version_id: compareLeft, right_version_id: compareRight })
        .then((data) => {
          const resp = data as BlockDiffResponse
          const raw = resp.diff ?? {}
          const normalized: Record<string, Record<string, BlockDiffFieldComparison>> = {}

          for (const [blockId, val] of Object.entries(raw)) {
            if (!val || typeof val !== 'object') continue
            const fields: Record<string, BlockDiffFieldComparison> = {}
            for (const [fieldKey, fieldVal] of Object.entries(val)) {
              if (
                fieldVal &&
                typeof fieldVal === 'object' &&
                !Array.isArray(fieldVal) &&
                'left' in fieldVal
              ) {
                const comparison = fieldVal as BlockDiffFieldComparison
                fields[fieldKey] = comparison
              }
            }
            if (Object.keys(fields).length > 0) {
              normalized[blockId] = fields
            }
          }

          setBlockDiffResult(Object.keys(normalized).length > 0 ? normalized : null)
        })
        .catch(() => setBlockDiffResult(null))
    } else {
      compareDiffs.mutate(
        { left_version_id: compareLeft, right_version_id: compareRight },
        { onSuccess: (data) => setDiffResult(data) }
      )
    }
  }

  function handleRestore(version: Version) {
    restoreVersion.mutate(version.id, {
      onSuccess: () => {
        toast.success(`Restored to v${version.version_number}`)
        setDetailOpen(false)
      },
      onError: (err) => {
        toast.error(`Restore failed: ${err.message}`)
      },
    })
  }

  if (!activeEntityId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
        <h1 className="mb-2 text-2xl font-bold">Version History</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Track changes and revert to previous versions
        </p>
        <EmptyState
          icon={<History className="h-6 w-6 text-muted-foreground" />}
          title="No entity selected"
          description="Select an entity from the sidebar to view its version history."
        />
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Version History</h1>
        <p className="text-sm text-muted-foreground">
          Track changes and revert to previous versions
        </p>
      </div>

      <div className="mb-4">
        <BranchSelector
          value={versionFilter.branchId ?? undefined}
          onChange={(branchId) => setVersionFilter({ branchId })}
        />
      </div>

      {versionsLoading ? (
        <VersionsLoadingSkeleton />
      ) : versionsError ? (
        <VersionsError message={versionsError.message ?? 'An unexpected error occurred.'} />
      ) : versions.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6 text-muted-foreground" />}
          title="No versions yet"
          description="Versions will appear here as changes are made to this entity."
        />
      ) : (
        <>
          <div className="mb-4 flex items-end gap-3 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Compare Versions</label>
              <div className="flex items-center gap-2">
                <Select value={compareLeft} onValueChange={setCompareLeft}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Left version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.version_number} — {new Date(v.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">vs</span>
                <Select value={compareRight} onValueChange={setCompareRight}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Right version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.version_number} — {new Date(v.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={handleCompare} disabled={!compareLeft || !compareRight || compareDiffs.isPending}>
              <GitCompare className="mr-1.5 h-3.5 w-3.5" />
              {compareDiffs.isPending ? 'Comparing...' : 'Compare'}
            </Button>
          </div>
          <div className="mb-3 flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
            <button
              onClick={() => setViewMode('entity')}
              className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'entity' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Entity View
            </button>
            <button
              onClick={() => setViewMode('block')}
              className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'block' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Block View
            </button>
          </div>
          {viewMode === 'entity' && diffResult != null && (
            <DiffDisplay diff={diffResult as Record<string, unknown>} />
          )}
          {viewMode === 'block' && (
            <BlockChangesView diff={blockDiffResult} />
          )}

          <VersionTimeline
            entityId={activeEntityId}
            onVersionClick={(version) => { setSelectedVersion(version); setDetailOpen(true) }}
          />

          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Version {selectedVersion?.version_number}</DialogTitle>
                <DialogDescription>
                  Created {selectedVersion ? new Date(selectedVersion.created_at).toLocaleString() : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version ID</span>
                  <span className="font-mono text-xs">{selectedVersion?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entity ID</span>
                  <span className="font-mono text-xs">{selectedVersion?.entity_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version Number</span>
                  <span>{selectedVersion?.version_number}</span>
                </div>
                {'snapshot_id' in (selectedVersion ?? {}) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Snapshot ID</span>
                    <span className="font-mono text-xs">{(selectedVersion as VersionWithSnapshot)?.snapshot_id}</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => selectedVersion && handleRestore(selectedVersion)}
                  disabled={restoreVersion.isPending}
                >
                  {restoreVersion.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {restoreVersion.isPending ? 'Restoring...' : 'Restore'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCreateSnapshot} disabled={createSnapshot.isPending}>
                  <Camera className="mr-1.5 h-3.5 w-3.5" />
                  {createSnapshot.isPending ? 'Creating...' : 'Create Snapshot'}
                </Button>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </motion.div>
  )
}
