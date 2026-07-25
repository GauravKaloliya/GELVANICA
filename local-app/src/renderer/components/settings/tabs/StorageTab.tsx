import { useCallback } from 'react'
import { HardDrive, FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, NumberInput } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'

export function StorageTab({ settings, update }: { settings: AppSettings; update: SettingsUpdateFn }) {
  const browseDirectory = useCallback(async () => {
    const paths = await window.gnovium.dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (paths.length > 0) {
      update('backups', 'export_path', paths[0]!)
    }
  }, [update])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-4 w-4" /> Storage & Backups
        </CardTitle>
        <CardDescription>Backup frequency and export paths</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Backup interval" description="How often to create backups (in minutes)">
          <NumberInput value={settings.backups.backup_interval} onChange={(v) => update('backups', 'backup_interval', v)} min={5} max={1440} step={5} suffix="min" />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Max backups" description="Number of backups to retain before pruning">
          <NumberInput value={settings.backups.max_backups} onChange={(v) => update('backups', 'max_backups', v)} min={1} max={100} step={1} />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Export path" description="Directory where exports are saved">
          <div className="flex items-center gap-2">
            <Input value={settings.backups.export_path} onChange={(e) => update('backups', 'export_path', e.target.value)} placeholder="~/GNOVIUM-Backups" className="w-64" />
            <Button variant="outline" size="sm" onClick={browseDirectory}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
