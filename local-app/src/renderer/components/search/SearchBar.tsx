import { useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Loader2, Command } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  onFocus?: () => void
  onBlur?: () => void
  isLoading?: boolean
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function SearchBar({
  value,
  onChange,
  onClear,
  onFocus,
  onBlur,
  isLoading = false,
  placeholder = 'Search entities, blocks, tags...',
  autoFocus = true,
  className,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  // Global ⌘K shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleClear = useCallback(() => {
    onClear()
    inputRef.current?.focus()
  }, [onClear])

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center">
        <div className="absolute left-3 flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className="h-10 pl-10 pr-24 text-sm"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleClear}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>
      </div>
    </div>
  )
}
