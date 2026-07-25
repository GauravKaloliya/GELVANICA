import { useState } from 'react'
import { useTheme } from '@/providers/ThemeProvider'
import { useAccessibility } from '@/providers/AccessibilityProvider'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FontSizeControl } from '@/components/common/FontSizeControl'

const ACCENT_COLORS = [
  { name: 'Indigo', value: '239 84% 65%' },
  { name: 'Blue', value: '217 91% 60%' },
  { name: 'Emerald', value: '160 84% 39%' },
  { name: 'Amber', value: '38 92% 50%' },
  { name: 'Rose', value: '347 77% 50%' },
  { name: 'Purple', value: '271 91% 65%' },
  { name: 'Cyan', value: '189 94% 43%' },
  { name: 'Orange', value: '25 95% 53%' },
]

const FONT_FAMILIES = [
  { name: 'System', value: 'system-ui, -apple-system, sans-serif' },
  { name: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
  { name: 'Georgia', value: 'Georgia, serif' },
]

const themes = ['dark', 'light', 'sepia', 'high-contrast'] as const

const themeColors: Record<string, { bg: string; fg: string; accent: string }> = {
  dark: { bg: '#0a0a0b', fg: '#e5e5e5', accent: '#6366f1' },
  light: { bg: '#ffffff', fg: '#171717', accent: '#4f46e5' },
  sepia: { bg: '#f5f0e8', fg: '#433422', accent: '#c2752e' },
  'high-contrast': { bg: '#000000', fg: '#ffffff', accent: '#ffff00' },
}

const DEFAULT_THEME_COLOR = { bg: '#0a0a0b', fg: '#e5e5e5', accent: '#6366f1' }

function ThemePreviewCard({ name, isActive, onClick }: { name: string; isActive: boolean; onClick: () => void }) {
  const c = themeColors[name] ?? DEFAULT_THEME_COLOR
  return (
    <button onClick={onClick} className={cn('relative w-full rounded-lg border-2 p-1 transition-all', isActive ? 'border-primary' : 'border-border hover:border-primary/50')} aria-label={`${name} theme`}>
      <div className="overflow-hidden rounded-md" style={{ backgroundColor: c.bg }}>
        <div className="h-3 w-full" style={{ backgroundColor: c.accent }} />
        <div className="space-y-1 p-2">
          <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: c.fg, opacity: 0.8 }} />
          <div className="h-1.5 w-1/2 rounded" style={{ backgroundColor: c.fg, opacity: 0.4 }} />
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1">
        {isActive && <Check className="h-3 w-3 text-primary" />}
        <span className="text-[10px] capitalize">{name}</span>
      </div>
    </button>
  )
}

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme()
  useAccessibility()
  const [accent, setAccent] = useState(() => { try { return localStorage.getItem('gnovium-accent') ?? ACCENT_COLORS[0]!.value } catch { return ACCENT_COLORS[0]!.value } })
  const [font, setFont] = useState(() => { try { return localStorage.getItem('gnovium-font-family') ?? FONT_FAMILIES[0]!.value } catch { return FONT_FAMILIES[0]!.value } })

  const applyAccent = (v: string) => { setAccent(v); document.documentElement.style.setProperty('--accent-hsl', v); try { localStorage.setItem('gnovium-accent', v) } catch { /* */ } }
  const applyFont = (v: string) => { setFont(v); document.documentElement.style.fontFamily = v; try { localStorage.setItem('gnovium-font-family', v) } catch { /* */ } }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Theme</h3>
        <div className="grid grid-cols-4 gap-2">
          {themes.map((t) => <ThemePreviewCard key={t} name={t} isActive={theme === t} onClick={() => setTheme(t)} />)}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Accent Color</h3>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <button key={c.value} onClick={() => applyAccent(c.value)} className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all', accent === c.value ? 'border-foreground scale-110' : 'border-transparent')} style={{ backgroundColor: `hsl(${c.value})` }} aria-label={`${c.name} accent`} aria-pressed={accent === c.value}>
              {accent === c.value && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Font Family</h3>
        <div className="grid grid-cols-2 gap-2">
          {FONT_FAMILIES.map((f) => (
            <button key={f.value} onClick={() => applyFont(f.value)} className={cn('rounded-lg border-2 p-3 text-left transition-all text-sm', font === f.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')} style={{ fontFamily: f.value }}>
              <div className="font-medium">{f.name}</div>
              <div className="text-xs text-muted-foreground mt-1">The quick brown fox</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Font Size</h3>
        <FontSizeControl />
      </div>
    </div>
  )
}
