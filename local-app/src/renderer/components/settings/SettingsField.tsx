import { Input } from '@/components/ui/input'

const MODIFIER_MAP: Record<string, string> = {
  Control: 'Ctrl',
  Meta: 'Mod',
  Alt: 'Alt',
  Shift: 'Shift',
}

export function formatCombo(combo: string): string {
  return combo
    .split('+')
    .map((part) => MODIFIER_MAP[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' + ')
}

export function FieldGroup({
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

export function NumberInput({
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
      {suffix && (
        <span className="text-xs text-muted-foreground">{suffix}</span>
      )}
    </div>
  )
}
