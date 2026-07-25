import { Gauge, Cpu } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, NumberInput } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'

export function PerformanceTab({ settings, update }: { settings: AppSettings; update: SettingsUpdateFn }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Performance
        </CardTitle>
        <CardDescription>Cache, batch processing, and worker settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Max cache size" description="Maximum size of the local cache in MB">
          <NumberInput value={settings.performance.max_cache_size} onChange={(v) => update('performance', 'max_cache_size', v)} min={64} max={4096} step={64} suffix="MB" />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Batch size" description="Number of items processed per batch">
          <NumberInput value={settings.performance.batch_size} onChange={(v) => update('performance', 'batch_size', v)} min={10} max={500} step={10} />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Worker count" description="Number of background worker threads">
          <div className="flex items-center gap-3">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <input type="range" min={1} max={8} step={1} value={settings.performance.worker_count} onChange={(e) => update('performance', 'worker_count', Number(e.target.value))} className="w-36 accent-primary" />
            <span className="w-4 text-right text-sm tabular-nums">{settings.performance.worker_count}</span>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
