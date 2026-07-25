import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Sparkles, FolderOpen, Cpu } from 'lucide-react'
import type { AppSettings } from '@shared/types'

function FieldRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isNaN(n)) onChange(n)
        }}
        className="w-24 text-right"
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  )
}

interface AISettingsProps {
  settings: AppSettings['ai']
  onUpdate: <K extends keyof AppSettings['ai']>(key: K, value: AppSettings['ai'][K]) => void
  onBrowseModel?: () => void
}

export function AISettings({ settings, onUpdate, onBrowseModel }: AISettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> AI Configuration
        </CardTitle>
        <CardDescription>
          Local model path, GPU offloading, and inference settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />

        <FieldRow
          label="Model path"
          description="Path to local GGUF model file"
        >
          <div className="flex items-center gap-2">
            <Input
              value={settings.model_path}
              onChange={(e) => onUpdate('model_path', e.target.value)}
              placeholder="/path/to/model.gguf"
              className="w-64"
            />
            {onBrowseModel && (
              <Button variant="outline" size="sm" onClick={onBrowseModel}>
                <FolderOpen className="mr-1 h-3.5 w-3.5" />
                Browse
              </Button>
            )}
          </div>
        </FieldRow>

        <Separator />

        <FieldRow
          label="GPU layers"
          description="Number of layers offloaded to GPU (0 = CPU only)"
        >
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <NumberInput
              value={settings.gpu_layers}
              onChange={(v) => onUpdate('gpu_layers', v)}
              min={0}
              max={32}
              step={1}
            />
          </div>
        </FieldRow>

        <Separator />

        <FieldRow
          label="Context window"
          description="Maximum context length for inference"
        >
          <NumberInput
            value={settings.context_window ?? 2048}
            onChange={(v) => onUpdate('context_window', v)}
            min={512}
            max={32768}
            step={256}
            suffix="tokens"
          />
        </FieldRow>

        <Separator />

        <FieldRow
          label="Temperature"
          description="Controls randomness (0 = deterministic, 1 = creative)"
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={settings.temperature ?? 0.7}
              onChange={(e) => onUpdate('temperature', Number(e.target.value))}
              className="w-36 accent-primary"
            />
            <span className="w-10 text-right text-sm tabular-nums">
              {(settings.temperature ?? 0.7).toFixed(2)}
            </span>
          </div>
        </FieldRow>

        <Separator />

        <FieldRow
          label="Max tokens"
          description="Maximum tokens to generate per response"
        >
          <NumberInput
            value={settings.max_tokens ?? 512}
            onChange={(v) => onUpdate('max_tokens', v)}
            min={64}
            max={4096}
            step={64}
            suffix="tokens"
          />
        </FieldRow>

        <Separator />

        <FieldRow
          label="Confidence threshold"
          description="Minimum confidence for AI suggestions"
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.confidence_threshold}
              onChange={(e) =>
                onUpdate('confidence_threshold', Number(e.target.value))
              }
              className="w-36 accent-primary"
            />
            <span className="w-10 text-right text-sm tabular-nums">
              {settings.confidence_threshold.toFixed(2)}
            </span>
          </div>
        </FieldRow>

        <Separator />

        <FieldRow
          label="Auto-suggest"
          description="Show AI-powered suggestions while editing"
        >
          <Switch
            checked={settings.auto_suggest}
            onCheckedChange={(v) => onUpdate('auto_suggest', v)}
          />
        </FieldRow>

        <Separator />

        <FieldRow
          label="Embedding model"
          description="BGE-M3 model path for semantic search"
        >
          <Input
            value={settings.embedding_model ?? ''}
            onChange={(e) => onUpdate('embedding_model', e.target.value)}
            placeholder="BGE-M3 (auto-download)"
            className="w-64"
          />
        </FieldRow>
      </CardContent>
    </Card>
  )
}
