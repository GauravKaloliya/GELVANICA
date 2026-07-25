import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function VirtualizedList<T>({
  items, renderItem, estimateSize = 48, overscan = 5, className,
}: {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
  overscan?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const v = useVirtualizer({ count: items.length, getScrollElement: () => ref.current, estimateSize: () => estimateSize, overscan })
  return (
    <div ref={ref} className={className} style={{ overflow: 'auto' }}>
      <div style={{ height: `${v.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {v.getVirtualItems().map((row) => (
          <div key={row.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }}>
            {renderItem(items[row.index]!, row.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
