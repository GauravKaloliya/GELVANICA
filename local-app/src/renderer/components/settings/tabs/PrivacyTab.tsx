import { Shield } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'

export function PrivacyTab({ settings, update }: { settings: AppSettings; update: SettingsUpdateFn }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" /> Privacy
        </CardTitle>
        <CardDescription>Control telemetry and data collection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Telemetry" description="Send anonymous usage data to help improve GNOVIUM">
          <Switch checked={settings.privacy.telemetry} onCheckedChange={(v) => update('privacy', 'telemetry', v)} />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Crash reports" description="Automatically send crash reports when errors occur">
          <Switch checked={settings.privacy.crash_reports} onCheckedChange={(v) => update('privacy', 'crash_reports', v)} />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Analytics" description="Allow collection of feature-usage analytics">
          <Switch checked={settings.privacy.analytics} onCheckedChange={(v) => update('privacy', 'analytics', v)} />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
