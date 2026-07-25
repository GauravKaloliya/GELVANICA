import { useState } from 'react'
import { Shield, Eye, EyeOff, Trash2, Download, Lock } from 'lucide-react'

interface PrivacySetting {
  id: string
  label: string
  description: string
  enabled: boolean
}

export default function PrivacyPage() {
  const [settings, setSettings] = useState<PrivacySetting[]>([
    {
      id: 'analytics',
      label: 'Usage Analytics',
      description: 'Share anonymous usage data to help improve the application. No personal data is collected.',
      enabled: false,
    },
    {
      id: 'crash_reporting',
      label: 'Crash Reporting',
      description: 'Automatically send crash reports to help fix bugs. Includes error logs and system info.',
      enabled: true,
    },
    {
      id: 'ai_local',
      label: 'Local AI Processing',
      description: 'Process AI queries locally on your device. Data never leaves your machine.',
      enabled: true,
    },
    {
      id: 'cloud_sync',
      label: 'Cloud Sync',
      description: 'Sync your data with the cloud server for cross-device access.',
      enabled: false,
    },
  ])
  const [saved, setSaved] = useState(false)

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
    setSaved(false)
  }

  const saveSettings = async () => {
    try {
      await window.gnovium?.ipc?.invoke('settings:set', {
        key: 'privacy',
        value: Object.fromEntries(settings.map((s) => [s.id, s.enabled])),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // Settings save failed
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Privacy Controls</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how your data is used and shared.
        </p>
      </div>

      <div className="space-y-3">
        {settings.map((setting) => (
          <div key={setting.id} className="flex items-start justify-between rounded-lg border p-4">
            <div className="flex items-start gap-3">
              {setting.enabled ? (
                <Eye className="mt-0.5 h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="mt-0.5 h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <span className="text-sm font-medium">{setting.label}</span>
                <p className="mt-1 text-xs text-muted-foreground">{setting.description}</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting(setting.id)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                setting.enabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
                  setting.enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={saveSettings}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          {saved ? 'Saved!' : 'Save Privacy Settings'}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted">
            <Download className="h-4 w-4" />
            Export My Data
          </button>
          <button className="flex items-center justify-center gap-2 rounded-md border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
            Delete All Data
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Data Security</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          All data is stored locally on your device. Auth tokens are encrypted using your OS keychain.
          Backups can be encrypted with AES-256-GCM. No data is transmitted without your explicit consent.
        </p>
      </div>
    </div>
  )
}
