import { Wrench, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'

export function AdvancedTab({
  settings,
  update,
  onResetDefaults,
}: {
  settings: AppSettings
  update: SettingsUpdateFn
  onResetDefaults: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-4 w-4" /> Advanced
        </CardTitle>
        <CardDescription>Developer options and experimental features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Debug mode" description="Enable verbose developer logging">
          <Switch checked={settings.advanced.debug_mode} onCheckedChange={(v) => update('advanced', 'debug_mode', v)} />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Log level" description="Minimum severity level for logs">
          <Select value={settings.advanced.log_level} onValueChange={(v) => update('advanced', 'log_level', v as AppSettings['advanced']['log_level'])}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
        <Separator />
        <FieldGroup label="Experimental features" description="Enable unstable features still in development">
          <Switch checked={settings.advanced.experimental_features} onCheckedChange={(v) => update('advanced', 'experimental_features', v)} />
        </FieldGroup>
        <Separator className="my-4" />
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Reset to Defaults</p>
            <p className="text-xs text-muted-foreground">
              Restore all settings to their factory defaults. This cannot be undone.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={onResetDefaults}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
