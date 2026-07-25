import { useState, useEffect } from 'react'
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { AppSettings } from '@shared/types'

interface DiagnosticItem {
  label: string
  status: 'ok' | 'error' | 'loading'
  value: string
}

export function DiagnosticsPage() {
  const [items, setItems] = useState<DiagnosticItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function runDiagnostics() {
      const results: DiagnosticItem[] = []

      // Flask health
      try {
        const health = await window.gnovium?.ipc?.invoke('auth:is-online') as { online?: boolean }
        results.push({
          label: 'Flask Server',
          status: health?.online ? 'ok' : 'error',
          value: health?.online ? 'Running' : 'Not responding',
        })
      } catch {
        results.push({ label: 'Flask Server', status: 'error', value: 'Check failed' })
      }

      // Auth state
      try {
        const auth = await window.gnovium?.ipc?.invoke('auth:status') as { authenticated?: boolean; user?: { name?: string } }
        results.push({
          label: 'Authentication',
          status: auth?.authenticated ? 'ok' : 'error',
          value: auth?.authenticated ? `Authenticated as ${auth.user?.name ?? 'User'}` : 'Not authenticated',
        })
      } catch {
        results.push({ label: 'Authentication', status: 'error', value: 'Check failed' })
      }

      // Settings
      try {
        const settings = await window.gnovium?.ipc?.invoke('settings:get-all') as Partial<AppSettings> | null
        results.push({
          label: 'Settings Store',
          status: settings ? 'ok' : 'error',
          value: settings ? 'Loaded' : 'Not available',
        })
      } catch {
        results.push({ label: 'Settings Store', status: 'error', value: 'Check failed' })
      }

      // Platform info
      results.push({
        label: 'Platform',
        status: 'ok',
        value: `${navigator.platform} | ${navigator.userAgent.split(' ').pop() ?? 'Unknown'}`,
      })

      // Log directory
      try {
        const logDir = await window.gnovium?.ipc?.invoke('app:get-log-dir') as string
        results.push({
          label: 'Log Directory',
          status: 'ok',
          value: logDir ?? 'Available',
        })
      } catch {
        results.push({ label: 'Log Directory', status: 'error', value: 'Not available' })
      }

      setItems(results)
      setLoading(false)
    }

    runDiagnostics()
  }, [])

  const icon = (status: DiagnosticItem['status']) => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />
      case 'loading': return <Clock className="h-4 w-4 animate-pulse text-muted-foreground" />
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Diagnostics</h1>
        <p className="text-sm text-muted-foreground">System health and configuration status</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Activity className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                {icon(item.status)}
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => window.location.reload()}
        className="w-full rounded-md border bg-muted/50 px-4 py-2 text-sm hover:bg-muted"
      >
        Refresh Diagnostics
      </button>
    </div>
  )
}
