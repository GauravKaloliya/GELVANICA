import { useRef, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'

interface BlockTextareaProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
}

export const BlockTextarea = memo(function BlockTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
}: BlockTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    },
    [onChange]
  )

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleInput}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className={cn(
        'w-full resize-none overflow-hidden bg-transparent',
        'text-sm leading-relaxed placeholder:text-muted-foreground/50',
        'focus:outline-none',
        className,
      )}
    />
  )
})
