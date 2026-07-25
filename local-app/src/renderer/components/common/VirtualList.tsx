import { useRef, useCallback, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualListProps<T> {
  items: T[]
  height: number | string
  estimateSize?: number
  overscan?: number
  gap?: number
  renderItem: (props: { item: T; index: number }) => ReactNode
  onEndReached?: () => void
  onEndReachedThreshold?: number
  className?: string
  emptyState?: ReactNode
}

export function VirtualList<T>({
  items,
  height,
  estimateSize = 48,
  overscan = 5,
  gap = 0,
  renderItem,
  onEndReached,
  onEndReachedThreshold = 0.8,
  className,
  emptyState,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    gap,
  })

  const handleScroll = useCallback(() => {
    if (!onEndReached || !parentRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current
    const threshold = scrollHeight * onEndReachedThreshold
    if (scrollTop + clientHeight >= threshold) {
      onEndReached()
    }
  }, [onEndReached, onEndReachedThreshold])

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height,
        overflow: 'auto',
        willChange: 'transform',
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          if (!item) return null
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem({ item, index: virtualRow.index })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface UseInfiniteVirtualListProps<T> {
  items: T[]
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

export function useInfiniteVirtualList<T>({
  items,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: UseInfiniteVirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: hasNextPage ? items.length + 1 : items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  })

  const handleScroll = useCallback(() => {
    if (!parentRef.current || !hasNextPage || isFetchingNextPage) return
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return {
    parentRef,
    virtualizer,
    handleScroll,
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    getItem: (index: number) => items[index],
  }
}
