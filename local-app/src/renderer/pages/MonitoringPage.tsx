import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, Info, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface Alert {
  id: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  timestamp: string
  source: string
}

export default function MonitoringPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = async () => {
    setLoading(true)
    const results: Alert[] = []

    // Check Flask health
    try {
      const health = await window.gnovium?.ipc?.invoke('auth:is-online') as { online?: boolean }
      results.push({
        id: 'flask-health',
        level: health?.online ? 'success' : 'error',
        message: health?.online ? 'Flask server is running' : 'Flask server is not responding',
        timestamp: new Date().toISOString(),
        source: 'system',
      })
    } catch {
      results.push({
        id: 'flask-health',
        level: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
        source: 'system',
      })
    }

    // Check auth state
    try {
      const auth = await window.gnovium?.ipc?.invoke('auth:status') as { authenticated?: boolean }
      results.push({
        id: 'auth-state',
        level: auth?.authenticated ? 'success' : 'warning',
        message: auth?.authenticated ? 'Authenticated' : 'Not authenticated — limited functionality',
        timestamp: new Date().toISOString(),
        source: 'auth',
      })
    } catch {
      results.push({
        id: 'auth-state',
        level: 'error',
        message: 'Auth state check failed',
        timestamp: new Date().toISOString(),
        source: 'auth',
      })
    }

    // Check sync status
    try {
      const sync = await window.gnovium?.ipc?.invoke('sync:status', '') as { data?: unknown }
      results.push({
        id: 'sync-status',
        level: 'info',
        message: sync?.data ? 'Sync data available' : 'No pending sync operations',
        timestamp: new Date().toISOString(),
        source: 'sync',
      })
    } catch {
      results.push({
        id: 'sync-status',
        level: 'info',
        message: 'Sync status unavailable',
        timestamp: new Date().toISOString(),
        source: 'sync',
      })
    }

    setAlerts(results)
    setLoading(false)
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(interval)
  }, [])

  const levelIcon = (level: Alert['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Monitoring & Alerts</h1>
            <p className="text-sm text-muted-foreground">System health and alert status</p>
          </div>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="mt-0.5 shrink-0">{levelIcon(alert.level)}</div>
            <div className="flex-1">
              <p className="text-sm">{alert.message}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{alert.source}</span>
                <span>-</span>
                <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && !loading && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No alerts to display
        </div>
      )}
    </div>
  )
}
