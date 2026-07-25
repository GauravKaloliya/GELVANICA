import { rendererLogger } from '@lib/logger'
import { ExponentialBackoff } from './backoff'

/**
 * Renderer-process poller for workspace sync.
 * Uses IPC to trigger sync via the main process (auth-aware).
 */
const SYNC_INTERVAL_MS = 30_000
let syncTimer: ReturnType<typeof setInterval> | null = null
let isRunning = false
const backoff = new ExponentialBackoff()

export interface SyncWorkerConfig {
  workspaceId: string
  onSyncStart?: () => void
  onSyncComplete?: (result: { synced: number; conflicts: number }) => void
  onSyncError?: (error: Error) => void
  onConflictDetected?: (conflictId: string) => void
}

let config: SyncWorkerConfig | null = null

interface SyncResponse {
  data?: {
    synced_count?: number
    conflict_count?: number
    operations?: Array<{ id: string }>
    conflicts?: Array<{ id: string }>
  }
}

async function performSync(): Promise<void> {
  if (!config) return
  try {
    config.onSyncStart?.()

    const raw = await window.gnovium.ipc.invoke('sync:trigger', config.workspaceId)
    const resp = (raw as SyncResponse | null) ?? {}
    const data = resp.data ?? {}
    const synced = data.synced_count ?? data.operations?.length ?? 0
    const conflictCount = data.conflict_count ?? data.conflicts?.length ?? 0

    const conflictList = data.conflicts
    if (conflictList && conflictList.length > 0) {
      for (const conflict of conflictList) {
        config.onConflictDetected?.(conflict.id)
      }
    }

    config.onSyncComplete?.({ synced, conflicts: conflictCount })
    rendererLogger.info('SyncWorker', `Sync complete: ${synced} synced, ${conflictCount} conflicts`)
    backoff.reset()
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    config.onSyncError?.(error)
    rendererLogger.error('SyncWorker', `Sync failed, backing off ${backoff.currentDelay}ms`, { message: error.message })
    scheduleRetry()
  }
}

function scheduleRetry(): void {
  if (!config || !isRunning) return
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  syncTimer = setInterval(() => {
    if (!config || !isRunning) return
    performSync()
  }, backoff.next())
}

export function startSyncWorker(c: SyncWorkerConfig): void {
  stopSyncWorker()
  config = c
  isRunning = true
  backoff.reset()
  syncTimer = setInterval(() => {
    if (!config || !isRunning) return
    performSync()
  }, SYNC_INTERVAL_MS)
}

export function stopSyncWorker(): void {
  isRunning = false
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  config = null
  backoff.reset()
}

export function triggerSyncNow(): void {
  if (!config || !isRunning) return
  performSync()
}

export function isSyncWorkerRunning(): boolean {
  return isRunning
}
