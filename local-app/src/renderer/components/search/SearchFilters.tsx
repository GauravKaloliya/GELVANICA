import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X, FileText, Calendar, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export interface SearchFiltersState {
  matchType: 'all' | 'page' | 'block'
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year'
  minScore: number
  tags: string[]
}

interface FilterSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

function FilterSection({ title, icon: Icon, children }: FilterSectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-2 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all',
        active
          ? 'border-primary bg-primary/10 text-primary font-medium'
          : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
      )}
    >
      {active && <Check className="h-3 w-3" />}
      {label}
      {count !== undefined && (
        <span className="text-[10px] opacity-60">({count})</span>
      )}
    </button>
  )
}

export function SearchFilters({
  filters,
  onChange,
  resultCounts,
}: {
  filters: SearchFiltersState
  onChange: (filters: SearchFiltersState) => void
  resultCounts?: { page: number; block: number; total: number }
}) {
  const hasActiveFilters = useMemo(
    () =>
      filters.matchType !== 'all' ||
      filters.dateRange !== 'all' ||
      filters.minScore > 0 ||
      filters.tags.length > 0,
    [filters]
  )

  const clearAll = () => {
    onChange({
      matchType: 'all',
      dateRange: 'all',
      minScore: 0,
      tags: [],
    })
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Match Type */}
      <FilterSection title="Match Type" icon={FileText}>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="All"
            active={filters.matchType === 'all'}
            onClick={() => onChange({ ...filters, matchType: 'all' })}
            count={resultCounts?.total}
          />
          <FilterChip
            label="Pages"
            active={filters.matchType === 'page'}
            onClick={() => onChange({ ...filters, matchType: 'page' })}
            count={resultCounts?.page}
          />
          <FilterChip
            label="Blocks"
            active={filters.matchType === 'block'}
            onClick={() => onChange({ ...filters, matchType: 'block' })}
            count={resultCounts?.block}
          />
        </div>
      </FilterSection>

      <Separator />

      {/* Date Range */}
      <FilterSection title="Date Range" icon={Calendar}>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'today', 'week', 'month', 'year'] as const).map((range) => (
            <FilterChip
              key={range}
              label={range === 'all' ? 'Any time' : range === 'today' ? 'Today' : range === 'week' ? 'This week' : range === 'month' ? 'This month' : 'This year'}
              active={filters.dateRange === range}
              onClick={() => onChange({ ...filters, dateRange: range })}
            />
          ))}
        </div>
      </FilterSection>

      <Separator />

      {/* Min Score */}
      <FilterSection title="Relevance" icon={Filter}>
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={filters.minScore}
            onChange={(e) => onChange({ ...filters, minScore: Number(e.target.value) })}
            className="w-full accent-primary"
            aria-label="Minimum relevance score"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Any relevance</span>
            <span>Min {filters.minScore}%</span>
          </div>
        </div>
      </FilterSection>
    </div>
  )
}
