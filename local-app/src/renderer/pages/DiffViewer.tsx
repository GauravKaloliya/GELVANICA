import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitCompareArrows, SplitSquareHorizontal, AlignLeft, ChevronDown, ChevronUp, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCompareDiffs } from '@/hooks/useDiffs'

interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: Array<{ type: 'add' | 'remove' | 'context'; content: string; oldLine?: number; newLine?: number }>
}

interface DiffResult {
  entity_id: string
  entity_title: string
  hunks: DiffHunk[]
  stats: { additions: number; deletions: number; unchanged: number }
}

type ViewMode = 'side-by-side' | 'inline'

function DiffLine({ line, showLineNumbers }: { line: DiffHunk['lines'][0]; showLineNumbers: boolean }) {
  const colorClass =
    line.type === 'add'
      ? 'bg-emerald-500/10 text-emerald-400'
      : line.type === 'remove'
        ? 'bg-red-500/10 text-red-400'
        : 'text-muted-foreground'

  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '

  return (
    <div className={`flex font-mono text-xs leading-5 ${colorClass}`}>
      {showLineNumbers && (
        <span className="w-10 shrink-0 select-none text-right pr-2 text-muted-foreground/50">
          {line.oldLine ?? ''}
        </span>
      )}
      {showLineNumbers && (
        <span className="w-10 shrink-0 select-none text-right pr-2 text-muted-foreground/50">
          {line.newLine ?? ''}
        </span>
      )}
      <span className="w-5 shrink-0 select-none text-right pr-1">{prefix}</span>
      <span className="whitespace-pre">{line.content}</span>
    </div>
  )
}

export default function DiffViewer() {
  const [leftVersionId, setLeftVersionId] = useState('')
  const [rightVersionId, setRightVersionId] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [sameIdError, setSameIdError] = useState(false)

  const compareDiffs = useCompareDiffs()

  const loadDiff = useCallback(() => {
    if (!leftVersionId.trim() || !rightVersionId.trim()) return
    if (leftVersionId.trim() === rightVersionId.trim()) {
      setSameIdError(true)
      setDiffResult(null)
      return
    }
    setSameIdError(false)
    setDiffResult(null)
    compareDiffs.mutate(
      { left_version_id: leftVersionId.trim(), right_version_id: rightVersionId.trim() },
      {
        onSuccess: (data) => {
          if (data && typeof data === 'object' && 'diff' in data) {
            const resp = data as unknown as DiffResult
            setDiffResult(resp)
          }
        },
      },
    )
  }, [leftVersionId, rightVersionId, compareDiffs])

  const swapSides = () => {
    setLeftVersionId(rightVersionId)
    setRightVersionId(leftVersionId)
  }

  const toggleCollapse = (idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const isComparing = compareDiffs.isPending
  const hasIds = leftVersionId.trim().length > 0 && rightVersionId.trim().length > 0

  if (isComparing) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!diffResult) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <GitCompareArrows className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Compare Versions</h2>
          </div>
        </div>

        {/* Version selectors */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Left (old)</label>
            <Input
              placeholder="Paste left version ID..."
              value={leftVersionId}
              onChange={(e) => { setLeftVersionId(e.target.value); setSameIdError(false) }}
              className="h-8 font-mono text-xs"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-4 h-8 w-8 shrink-0"
            onClick={swapSides}
            title="Swap sides"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Right (new)</label>
            <Input
              placeholder="Paste right version ID..."
              value={rightVersionId}
              onChange={(e) => { setRightVersionId(e.target.value); setSameIdError(false) }}
              className="h-8 font-mono text-xs"
            />
          </div>
          <Button
            size="sm"
            className="mt-4"
            disabled={!hasIds || isComparing}
            onClick={loadDiff}
          >
            Compare
          </Button>
        </div>

        {sameIdError && (
          <div className="mx-4 mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Cannot compare a version against itself. Please enter two different version IDs.
          </div>
        )}

        {/* Empty state */}
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<GitCompareArrows className="h-6 w-6 text-muted-foreground" />}
            title="No Diff Available"
            description="Enter two different version IDs and click Compare to see the diff."
          />
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <GitCompareArrows className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{diffResult.entity_title}</h2>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-emerald-500">+{diffResult.stats.additions}</Badge>
            <Badge variant="outline" className="text-red-500">-{diffResult.stats.deletions}</Badge>
            <Badge variant="outline">{diffResult.stats.unchanged} unchanged</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <Button
            variant={viewMode === 'side-by-side' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('side-by-side')}
            className="h-7 px-2"
          >
            <SplitSquareHorizontal className="mr-1 h-3.5 w-3.5" />
            Split
          </Button>
          <Button
            variant={viewMode === 'inline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('inline')}
            className="h-7 px-2"
          >
            <AlignLeft className="mr-1 h-3.5 w-3.5" />
            Unified
          </Button>
        </div>
      </div>

      {/* Version selectors (compact) */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <div className="flex-1">
          <Input
            placeholder="Left version ID"
            value={leftVersionId}
            onChange={(e) => { setLeftVersionId(e.target.value); setSameIdError(false) }}
            className="h-7 font-mono text-[10px]"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={swapSides} title="Swap">
          <ArrowLeftRight className="h-3 w-3" />
        </Button>
        <div className="flex-1">
          <Input
            placeholder="Right version ID"
            value={rightVersionId}
            onChange={(e) => { setRightVersionId(e.target.value); setSameIdError(false) }}
            className="h-7 font-mono text-[10px]"
          />
        </div>
        <Button
          size="sm"
          className="h-7"
          disabled={!hasIds || isComparing}
          onClick={loadDiff}
        >
          {isComparing ? 'Comparing...' : 'Compare'}
        </Button>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto p-4">
        {diffResult.hunks.map((hunk, hunkIdx) => (
          <div key={hunkIdx} className="mb-4">
            {/* Hunk Header */}
            <button
              onClick={() => toggleCollapse(hunkIdx)}
              className="flex w-full items-center gap-2 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {collapsed.has(hunkIdx) ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              <span>
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </span>
            </button>

            {/* Lines */}
            <AnimatePresence>
              {!collapsed.has(hunkIdx) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {viewMode === 'side-by-side' ? (
                    <div className="grid grid-cols-2 border border-border">
                      <div className="border-r border-border">
                        {hunk.lines.map((line, i) => (
                          <DiffLine
                            key={i}
                            line={{
                              ...line,
                              type: line.type === 'add' ? 'context' : line.type === 'remove' ? 'remove' : 'context',
                            }}
                            showLineNumbers
                          />
                        ))}
                      </div>
                      <div>
                        {hunk.lines.map((line, i) => (
                          <DiffLine
                            key={i}
                            line={{
                              ...line,
                              type: line.type === 'remove' ? 'context' : line.type === 'add' ? 'add' : 'context',
                            }}
                            showLineNumbers
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-border">
                      {hunk.lines.map((line, i) => (
                        <DiffLine key={i} line={line} showLineNumbers />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
