import { Loader2, WifiOff, RefreshCw } from 'lucide-react'
import { useHealthCheck } from '@/hooks/useHealthCheck'

export function ReconnectingOverlay() {
  const { status, reconnect } = useHealthCheck()

  if (status === 'healthy' || status === 'checking') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-lg">
        {status === 'reconnecting' ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <WifiOff className="h-8 w-8 text-destructive" />
        )}
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            {status === 'reconnecting' ? 'Reconnecting...' : 'Connection Lost'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === 'reconnecting'
              ? 'Attempting to reconnect to the local server...'
              : 'The local Flask server is not responding.'}
          </p>
        </div>
        {status === 'disconnected' && (
          <button
            onClick={reconnect}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
