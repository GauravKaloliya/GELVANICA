import { Palette, Monitor, Type, Layers, Moon, Sun } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'
import { useTheme } from '@/providers/ThemeProvider'

export function AppearanceTab({ settings, update }: { settings: AppSettings; update: SettingsUpdateFn }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const cycle = () => {
    const order: Array<'dark' | 'light' | 'sepia' | 'high-contrast' | 'system'> = ['dark', 'light', 'sepia', 'high-contrast', 'system']
    const idx = order.indexOf(theme)
    const next = order[(idx + 1) % order.length] ?? 'dark'
    setTheme(next)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4" /> Appearance
        </CardTitle>
        <CardDescription>Theme, fonts, and layout density</CardDescription>
        <div className="flex items-center gap-2 mt-2">
          {resolvedTheme === 'dark' ? (
            <Moon className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            Current: {resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1)} mode
          </span>
          <button
            onClick={cycle}
            className="ml-auto rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            Cycle theme
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Theme" description="Application colour scheme">
          <Select value={settings.appearance.theme} onValueChange={(v) => update('appearance', 'theme', v as AppSettings['appearance']['theme'])}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                <span className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> System</span>
              </SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="sepia">Sepia</SelectItem>
              <SelectItem value="high-contrast">High Contrast</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
        <Separator />
        <FieldGroup label="Font size" description="Base font size for the editor">
          <div className="flex items-center gap-3">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <input type="range" min={12} max={24} step={1} value={settings.appearance.font_size} onChange={(e) => update('appearance', 'font_size', Number(e.target.value))} className="w-36 accent-primary" aria-label="Font size" />
            <span className="w-8 text-right text-sm tabular-nums">{settings.appearance.font_size}</span>
          </div>
        </FieldGroup>
        <Separator />
        <FieldGroup label="Density" description="Spacing between elements">
          <Select value={settings.appearance.density} onValueChange={(v) => update('appearance', 'density', v as AppSettings['appearance']['density'])}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
        <Separator />
        <FieldGroup label="Sidebar width" description="Width of the sidebar in pixels">
          <div className="flex items-center gap-3">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <input type="range" min={200} max={400} step={10} value={settings.appearance.sidebar_width} onChange={(e) => update('appearance', 'sidebar_width', Number(e.target.value))} className="w-36 accent-primary" aria-label="Sidebar width" />
            <span className="w-12 text-right text-sm tabular-nums">{settings.appearance.sidebar_width}px</span>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
