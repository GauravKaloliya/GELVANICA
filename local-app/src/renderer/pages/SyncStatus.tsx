import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Wifi, WifiOff, Clock, CheckCircle } from 'lucide-react'
import { rendererLogger } from '@lib/logger'
import { useStore } from '@/store'
import { useSyncOperations, useSyncTrigger } from '@/hooks/useSync'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { SyncStatus as SyncStatusType } from '@shared/types'

const STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  syncing: 'Syncing',
  error: 'Error',
  offline: 'Offline',
}

export default function SyncStatus() {
  const status = useStore((s) => s.status)
  const lastSyncedAt = useStore((s) => s.lastSyncedAt)
  const pendingChanges = useStore((s) => s.pendingChanges)
  const setStatus = useStore((s) => s.setStatus)
  const setLastSynced = useStore((s) => s.setLastSynced)
  const setPendingChanges = useStore((s) => s.setPendingChanges)

  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: syncOps, isLoading: loadingOps } = useSyncOperations({ workspace_id: activeWorkspaceId ?? undefined })
  const syncTrigger = useSyncTrigger()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const isOnline = status !== 'offline'

  const refreshStatus = useCallback(async () => {
    try {
      const state = (await window.gnovium.sync.getStatus()) as SyncStatusType
      setStatus(state.status)
      setLastSynced(state.last_synced_at)
      setPendingChanges(state.pending_operations)
    } catch {
      rendererLogger.warn('SyncStatus', 'Failed to refresh sync status')
    }
  }, [setStatus, setLastSynced, setPendingChanges])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    const unsub = window.gnovium.sync.onStatusChanged((state: SyncStatusType) => {
      setStatus(state.status)
      setLastSynced(state.last_synced_at)
      setPendingChanges(state.pending_operations)
    })
    return unsub
  }, [setStatus, setLastSynced, setPendingChanges])

  const handleSync = async () => {
    if (!activeWorkspaceId) return
    setIsSyncing(true)
    setSyncError(null)
    try {
      await syncTrigger.mutateAsync(activeWorkspaceId)
      await refreshStatus()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const statusVariant =
    status === 'error'
      ? 'destructive'
      : status === 'syncing'
        ? 'default'
        : 'secondary'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8"
    >
      <h1 className="mb-2 text-2xl font-bold">Sync Status</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Monitor synchronization with the cloud
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <Badge variant={statusVariant}>{STATUS_LABELS[status] ?? status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {lastSyncedAt ? formatRelativeTime(lastSyncedAt) : 'Never'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{pendingChanges}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{syncOps?.length ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="flex items-center justify-center">
          <CardContent className="pt-6">
            <Button onClick={handleSync} disabled={isSyncing || !isOnline}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {syncError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {syncError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOps ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : !syncOps || syncOps.length === 0 ? (
            <EmptyState
              icon={<RefreshCw className="h-6 w-6 text-muted-foreground" />}
              title="No sync activity"
              description="Changes will sync automatically when a connection is available."
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {syncOps.map((op) => (
                  <motion.div
                    key={op.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw
                        className={`h-4 w-4 ${
                          op.synced ? 'text-green-500' : 'text-muted-foreground'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{op.operation_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {op.entity_type ?? 'System'} &middot;{' '}
                          {formatDate(op.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={op.synced ? 'secondary' : 'outline'}>
                      {op.synced ? 'Synced' : 'Pending'}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
