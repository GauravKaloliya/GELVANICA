import { ChevronRight, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Breadcrumbs({ items }: { items: Array<{ label: string; path?: string }> }) {
  const navigate = useNavigate()
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors" aria-label="Home">
        <Home className="h-3.5 w-3.5" />
      </button>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {item.path ? (
            <button onClick={() => navigate(item.path!)} className="hover:text-foreground transition-colors">{item.label}</button>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
