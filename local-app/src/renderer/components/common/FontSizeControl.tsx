import { useAccessibility } from '@/providers/AccessibilityProvider'
import { Minus, Plus } from 'lucide-react'

export function FontSizeControl() {
  const { fontSize, setFontSize } = useAccessibility()
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Font size">
      <button onClick={() => setFontSize(fontSize - 1)} disabled={fontSize <= 10} className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50" aria-label="Decrease font size">
        <Minus className="h-3 w-3" />
      </button>
      <span className="min-w-[3rem] text-center text-xs text-muted-foreground" aria-live="polite">{fontSize}px</span>
      <button onClick={() => setFontSize(fontSize + 1)} disabled={fontSize >= 24} className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50" aria-label="Increase font size">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
