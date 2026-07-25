import { motion } from 'framer-motion'
import { Brain, Type, Sparkles, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchMode } from '@shared/types'

const MODES: {
  value: SearchMode
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}[] = [
  { value: 'keyword', label: 'Keyword', icon: Type, description: 'Fast exact-match search' },
  { value: 'full_text', label: 'Full Text', icon: FileText, description: 'Search within document content' },
  { value: 'semantic', label: 'Semantic', icon: Brain, description: 'AI-powered meaning search' },
  { value: 'hybrid', label: 'Hybrid', icon: Sparkles, description: 'Best of both worlds' },
]

export function SearchModeToggle({
  mode,
  onChange,
}: {
  mode: SearchMode
  onChange: (mode: SearchMode) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
      {MODES.map((m) => {
        const Icon = m.icon
        const active = mode === m.value

        return (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <motion.div
                layoutId="search-mode-bg"
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
