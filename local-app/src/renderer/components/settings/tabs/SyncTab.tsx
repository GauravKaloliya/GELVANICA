import { RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'

export function SyncTab({ settings, update }: { settings: AppSettings; update: SettingsUpdateFn }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Sync
        </CardTitle>
        <CardDescription>Cloud synchronisation and conflict resolution</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Auto sync" description="Automatically synchronise changes in the background">
          <Switch checked={settings.sync.auto_sync} onCheckedChange={(v) => update('sync', 'auto_sync', v)} />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Conflict strategy" description="How to resolve sync conflicts">
          <Select value={settings.sync.conflict_strategy} onValueChange={(v) => update('sync', 'conflict_strategy', v as AppSettings['sync']['conflict_strategy'])}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="local_wins">Local wins</SelectItem>
              <SelectItem value="cloud_wins">Cloud wins</SelectItem>
              <SelectItem value="ask">Ask each time</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
        <Separator />
        <FieldGroup label="Server URL" description="URL of the GNOVIUM sync server">
          <Input value={settings.sync.server_url} onChange={(e) => update('sync', 'server_url', e.target.value)} placeholder={import.meta.env.VITE_GNOVIUM_SERVER_URL || 'https://app.gnovium.com'} className="w-72" />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
