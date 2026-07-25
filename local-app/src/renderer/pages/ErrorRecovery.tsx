import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Trash2, Download, ArrowLeft, CheckCircle, RotateCcw, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBackupList } from '@/hooks/useBackup'
import { ROUTES } from '@/router'
import type { BackupExport } from '@shared/types'

interface RecoveryAction {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  variant: 'default' | 'destructive'
}

const recoveryActions: RecoveryAction[] = [
  {
    id: 'reload',
    label: 'Reload Application',
    description: 'Refresh the application and reload all data from the server.',
    icon: <RefreshCw className="h-4 w-4" />,
    variant: 'default',
  },
  {
    id: 'clear-cache',
    label: 'Clear Local Cache',
    description: 'Clear cached data and settings. Your workspaces and entities remain on the server.',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive',
  },
  {
    id: 'export-logs',
    label: 'Export Logs for Support',
    description: 'Download log files to share with the support team for debugging.',
    icon: <Download className="h-4 w-4" />,
    variant: 'default',
  },
  {
    id: 'reset-settings',
    label: 'Reset Settings to Defaults',
    description: 'Restore all settings to their default values. Your data is not affected.',
    icon: <RefreshCw className="h-4 w-4" />,
    variant: 'destructive',
  },
]

export default function ErrorRecovery() {
  const navigate = useNavigate()
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const backupList = useBackupList()

  const executeAction = async (actionId: string) => {
    setExecutingAction(actionId)
    setError(null)

    try {
      switch (actionId) {
        case 'reload':
          navigate(ROUTES.DASHBOARD, { replace: true })
          break
        case 'clear-cache':
          localStorage.clear()
          sessionStorage.clear()
          setCompletedActions((prev) => new Set(prev).add(actionId))
          break
        case 'export-logs':
          await window.gnovium?.ipc?.invoke('app:export-logs')
          setCompletedActions((prev) => new Set(prev).add(actionId))
          break
        case 'reset-settings':
          await window.gnovium?.ipc?.invoke('settings:reset')
          setCompletedActions((prev) => new Set(prev).add(actionId))
          break
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed'
      setError(msg)
      setLastError(msg)
    } finally {
      setExecutingAction(null)
    }
  }

  const handleRestore = async () => {
    try {
      const backups = backupList.data as BackupExport[] | undefined
      if (!backups || backups.length === 0) {
        setLastError('No backups available to restore from.')
        return
      }
      const filePath = await window.gnovium?.dialog?.showOpenDialog?.({
        title: 'Select Backup File',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      })
      if (filePath && filePath[0]) {
        await window.gnovium?.ipc?.invoke?.('backup:import', filePath[0])
        navigate(ROUTES.DASHBOARD, { replace: true })
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Error Recovery</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Something went wrong. Choose a recovery action below to fix the issue.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {recoveryActions.map((action) => (
          <button
            key={action.id}
            onClick={() => executeAction(action.id)}
            disabled={executingAction !== null}
            className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50 ${
              action.variant === 'destructive' ? 'border-destructive/30' : ''
            }`}
          >
            <div className="mt-0.5 shrink-0">{action.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{action.label}</span>
                {completedActions.has(action.id) && (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
            </div>
            {executingAction === action.id && (
              <RefreshCw className="mt-1 h-4 w-4 animate-spin text-primary" />
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup Restore</CardTitle>
          <CardDescription>
            Restore your data from a previous backup if recovery actions don't help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleRestore}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore from Backup
          </Button>
        </CardContent>
      </Card>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <FileText className="h-4 w-4" />
        {showDetails ? 'Hide Details' : 'View Error Details'}
      </button>

      {showDetails && (
        <div className="rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground">
          {lastError ?? 'No error details available. Reload the app to try again.'}
        </div>
      )}
    </div>
  )
}
