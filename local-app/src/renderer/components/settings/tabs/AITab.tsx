import { useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, NumberInput } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'

export function AITab({ settings, update }: { settings: AppSettings; update: SettingsUpdateFn }) {
  const browseModelFile = useCallback(async () => {
    const paths = await window.gnovium.dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'GGUF Model', extensions: ['gguf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (paths.length > 0) {
      update('ai', 'model_path', paths[0]!)
    }
  }, [update])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> AI
        </CardTitle>
        <CardDescription>Model configuration and inference settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Model path" description="Path to local GGUF model file">
          <div className="flex items-center gap-2">
            <Input value={settings.ai.model_path} onChange={(e) => update('ai', 'model_path', e.target.value)} placeholder="/path/to/model.gguf" className="w-64" />
            <Button variant="outline" size="sm" onClick={browseModelFile}>Browse</Button>
          </div>
        </FieldGroup>
        <Separator />
        <FieldGroup label="GPU layers" description="Number of layers offloaded to GPU (0 = CPU only)">
          <NumberInput value={settings.ai.gpu_layers} onChange={(v) => update('ai', 'gpu_layers', v)} min={0} max={32} step={1} />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Confidence threshold" description="Minimum confidence for AI suggestions">
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={1} step={0.05} value={settings.ai.confidence_threshold} onChange={(e) => update('ai', 'confidence_threshold', Number(e.target.value))} className="w-36 accent-primary" />
            <span className="w-10 text-right text-sm tabular-nums">{settings.ai.confidence_threshold.toFixed(2)}</span>
          </div>
        </FieldGroup>
        <Separator />
        <FieldGroup label="Auto-suggest" description="Show AI-powered suggestions while editing">
          <Switch checked={settings.ai.auto_suggest} onCheckedChange={(v) => update('ai', 'auto_suggest', v)} />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
