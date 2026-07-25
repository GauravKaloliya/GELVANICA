import { Globe } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, NumberInput } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'

export function GeneralTab({ settings, update }: { settings: AppSettings; update: SettingsUpdateFn }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-4 w-4" /> General
        </CardTitle>
        <CardDescription>Language, auto-save, and startup preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Language" description="Display language for the interface">
          <Select value={settings.general.language} onValueChange={(v) => update('general', 'language', v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
        <Separator />
        <FieldGroup label="Auto-save interval" description="Seconds between automatic saves (0 to disable)">
          <NumberInput value={settings.general.auto_save_interval} onChange={(v) => update('general', 'auto_save_interval', v)} min={0} max={600} step={5} suffix="sec" />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Startup behavior" description="What to show when the app launches">
          <Select value={settings.general.startup_behavior} onValueChange={(v) => update('general', 'startup_behavior', v as AppSettings['general']['startup_behavior'])}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="last_workspace">Last workspace</SelectItem>
              <SelectItem value="workspace_picker">Workspace picker</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
