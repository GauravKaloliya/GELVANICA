import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useBranches } from '@/hooks/useBranches'
import { useStore } from '@/store'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Branch } from '@shared/types'

export function BranchSelector({
  value,
  onChange,
  className,
}: {
  value?: string
  onChange?: (branchId: string) => void
  className?: string
}) {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: branchesData, isLoading } = useBranches(activeWorkspaceId ?? undefined)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const branches = useMemo(() => ((branchesData as { data?: Branch[] })?.data ?? []) as Branch[], [branchesData])
  const selected = branches.find((b) => b.id === value) ?? branches.find((b) => b.is_default)

  const filtered = useMemo(() => {
    if (!query) return branches
    const q = query.toLowerCase()
    return branches.filter((b) => b.name.toLowerCase().includes(q))
  }, [branches, query])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return <Skeleton className="h-8 w-40" />
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-sm transition-colors hover:border-primary/50"
      >
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate max-w-[120px]">
          {selected?.name ?? 'Select branch'}
        </span>
        {selected?.is_default && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">default</Badge>
        )}
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-popover shadow-lg"
          >
            {/* Search */}
            <div className="border-b px-3 py-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter branches..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
                aria-label="Filter branches"
              />
            </div>

            {/* Branches */}
            <ScrollArea className="max-h-60">
              <div className="p-1.5">
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No branches found</p>
                ) : (
                  filtered.map((branch) => {
                    const isSelected = branch.id === (value ?? selected?.id)
                    return (
                      <button
                        key={branch.id}
                        onClick={() => {
                          onChange?.(branch.id)
                          setOpen(false)
                          setQuery('')
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        )}
                      >
                        <GitBranch className="h-3.5 w-3.5 shrink-0" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate font-medium">{branch.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(branch.created_at)}
                          </p>
                        </div>
                        {branch.is_default && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 shrink-0">default</Badge>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
