import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Check, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTags } from '@/hooks/useTags'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Tag as TagType } from '@shared/types'

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6b7280',
]

export function TagPicker({
  selectedTagIds = [],
  onToggle,
  onClose,
}: {
  selectedTagIds?: string[]
  onToggle: (tagId: string) => void
  onClose?: () => void
}) {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: tagsData } = useTags(activeWorkspaceId ?? undefined)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const tags = useMemo(() => ((tagsData as { data?: TagType[] })?.data ?? []) as TagType[], [tagsData])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    if (!query) return tags
    const q = query.toLowerCase()
    return tags.filter((t) => t.name.toLowerCase().includes(q))
  }, [tags, query])

  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])

  return (
    <div className="w-64 rounded-lg border bg-popover shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tags..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Search tags"
        />
        {onClose && (
          <button onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Close tag picker">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tags */}
      <ScrollArea className="max-h-60">
        <div className="p-1.5">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {query ? 'No matching tags' : 'No tags available'}
            </p>
          ) : (
            filtered.map((tag) => {
              const isSelected = selectedSet.has(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                  )}
                >
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color ?? TAG_COLORS[0] }}
                  />
                  <span className="flex-1 text-left truncate">{tag.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-3 py-2">
        <p className="text-[10px] text-muted-foreground">
          {selectedTagIds.length} selected
        </p>
      </div>
    </div>
  )
}
