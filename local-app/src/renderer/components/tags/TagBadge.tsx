import { motion } from 'framer-motion'
import { Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6b7280',
]

interface TagBadgeProps {
  name: string
  color?: string | null
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

export function TagBadge({
  name,
  color,
  size = 'sm',
  removable = false,
  onRemove,
  onClick,
  className,
}: TagBadgeProps) {
  const bgColor = color ?? TAG_COLORS[0]
  const isClickable = !!onClick

  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        size === 'sm' && 'px-2 py-0.5 text-[11px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        isClickable && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: `${bgColor}20`,
        color: bgColor,
        borderWidth: 1,
        borderColor: `${bgColor}40`,
      }}
      onClick={onClick}
    >
      <Tag className={cn(
        'shrink-0',
        size === 'sm' && 'h-2.5 w-2.5',
        size === 'md' && 'h-3 w-3',
        size === 'lg' && 'h-3.5 w-3.5',
      )} />
      <span className="truncate">{name}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={cn(
            'shrink-0 rounded-full transition-colors hover:bg-black/10',
            size === 'sm' && 'ml-0.5 p-px',
            size === 'md' && 'ml-0.5 p-0.5',
            size === 'lg' && 'ml-1 p-0.5',
          )}
          aria-label={`Remove tag ${name}`}
        >
          <X className={cn(
            size === 'sm' && 'h-2.5 w-2.5',
            size === 'md' && 'h-3 w-3',
            size === 'lg' && 'h-3.5 w-3.5',
          )} />
        </button>
      )}
    </motion.span>
  )
}
