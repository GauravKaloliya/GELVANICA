import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RefreshCw, Server, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
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

interface SyncSettingsProps {
  settings: AppSettings['sync']
  onUpdate: <K extends keyof AppSettings['sync']>(key: K, value: AppSettings['sync'][K]) => void
  lastSyncedAt?: string
}

export function SyncSettings({
  settings,
  onUpdate,
  lastSyncedAt,
}: SyncSettingsProps) {
  const { isOnline } = useOnlineStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Sync
        </CardTitle>
        <CardDescription>
          Cloud synchronisation and conflict resolution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />

        {/* Connection status */}
        <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Connection Status</span>
          </div>
          <Badge variant={isOnline ? 'default' : 'secondary'}>
            {isOnline ? 'Connected' : 'Offline'}
          </Badge>
        </div>

        {lastSyncedAt && (
          <p className="px-1 pt-1 text-[11px] text-muted-foreground">
            Last synced: {lastSyncedAt}
          </p>
        )}

        <div className="mt-2" />
        <Separator />

        <FieldRow
          label="Auto sync"
          description="Automatically synchronise changes in the background"
        >
          <Switch
            checked={settings.auto_sync}
            onCheckedChange={(v) => onUpdate('auto_sync', v)}
            disabled={!isOnline}
          />
        </FieldRow>

        <Separator />

        <FieldRow
          label="Sync interval"
          description="How often to check for remote changes"
        >
          <Select
            value={String(settings.sync_interval ?? 30)}
            onValueChange={(v) => onUpdate('sync_interval', Number(v))}
            disabled={!isOnline}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">Every 15s</SelectItem>
              <SelectItem value="30">Every 30s</SelectItem>
              <SelectItem value="60">Every 1 min</SelectItem>
              <SelectItem value="300">Every 5 min</SelectItem>
              <SelectItem value="0">Manual only</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <Separator />

        <FieldRow
          label="Conflict strategy"
          description="How to resolve sync conflicts"
        >
          <Select
            value={settings.conflict_strategy}
            onValueChange={(v) =>
              onUpdate(
                'conflict_strategy',
                v as AppSettings['sync']['conflict_strategy']
              )
            }
            disabled={!isOnline}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local_wins">Local wins</SelectItem>
              <SelectItem value="cloud_wins">Cloud wins</SelectItem>
              <SelectItem value="ask">Ask each time</SelectItem>
              <SelectItem value="manual">Manual merge</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <Separator />

        <FieldRow
          label="Server URL"
          description="URL of the GNOVIUM sync server"
        >
          <Input
            value={settings.server_url}
            onChange={(e) => onUpdate('server_url', e.target.value)}
            placeholder={import.meta.env.VITE_GNOVIUM_SERVER_URL || 'https://app.gnovium.com'}
            className="w-72"
          />
        </FieldRow>

        <Separator />

        <FieldRow
          label="Sync on save"
          description="Push changes to cloud immediately after saving"
        >
          <Switch
            checked={settings.sync_on_save ?? true}
            onCheckedChange={(v) => onUpdate('sync_on_save', v)}
            disabled={!isOnline}
          />
        </FieldRow>

        <Separator />

        <FieldRow
          label="Offline queue"
          description="Queue changes made while offline for later sync"
        >
          <Switch
            checked={settings.offline_queue ?? true}
            onCheckedChange={(v) => onUpdate('offline_queue', v)}
          />
        </FieldRow>

        {!isOnline && settings.auto_sync && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="text-xs">
              <p className="font-medium text-amber-600">Sync is enabled but offline</p>
              <p className="mt-0.5 text-muted-foreground">
                Changes will be queued and synced when connection is restored.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
