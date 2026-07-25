import { Inbox } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { VirtualList } from '@/components/common/VirtualList'
import { TagBadge } from '@/components/tags/TagBadge'
import type { SearchResult } from '@shared/types'

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export function SearchResults({
  results,
  query,
  isLoading,
  onResultClick,
}: {
  results?: SearchResult[]
  query: string
  isLoading: boolean
  onResultClick: (entityId: string) => void
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="text-sm text-muted-foreground">Type a query to search</p>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No results found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try a different query or search mode.
        </p>
      </div>
    )
  }

  return (
    <VirtualList
      items={results}
      height="100%"
      estimateSize={72}
      overscan={5}
      gap={8}
      renderItem={({ item: result }) => (
        <button
          key={result.entity_id}
          onClick={() => onResultClick(result.entity_id)}
          className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                <HighlightText text={result.title ?? 'Untitled'} query={query} />
              </p>
              {result.snippet && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  <HighlightText text={result.snippet} query={query} />
                </p>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {Math.round(result.score * 100)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5">{result.match_type}</span>
            {result.tags?.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
            ))}
          </div>
        </button>
      )}
    />
  )
}
