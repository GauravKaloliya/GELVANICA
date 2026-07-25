import { api } from '@lib/api'
import { rendererLogger } from '@lib/logger'
import { ExponentialBackoff } from './backoff'

/**
 * Renderer-process poller for scheduled backups.
 * Not a true Web Worker — runs on the main thread via setInterval.
 * Uses renderer-process polling. For production, consider Electron utilityProcess.
 */
let isRunning = false
let backupTimer: ReturnType<typeof setInterval> | null = null

const DEFAULT_BACKUP_INTERVAL_MS = 86_400_000
const backoff = new ExponentialBackoff()

export interface BackupWorkerConfig {
  workspaceId: string
  intervalMs?: number
  onBackupStart?: () => void
  onBackupComplete?: (result: { path: string }) => void
  onBackupError?: (error: Error) => void
}

let config: BackupWorkerConfig | null = null

async function performBackup(): Promise<void> {
  if (!config || !isRunning) return
  try {
    config.onBackupStart?.()
    const result = await api.backups.exportToDisk({ workspace_id: config.workspaceId })
    config.onBackupComplete?.(result ?? { path: '' })
    backoff.reset()
  } catch (err) {
    config.onBackupError?.(err instanceof Error ? err : new Error(String(err)))
    rendererLogger.error('BackupWorker', 'Backup failed, backing off', {
      message: err instanceof Error ? err.message : String(err),
      delay: backoff.currentDelay,
    })
    scheduleRetry()
  }
}

function scheduleRetry(): void {
  if (!config || !isRunning) return
  if (backupTimer) {
    clearInterval(backupTimer)
    backupTimer = null
  }
  backupTimer = setInterval(performBackup, backoff.next())
}

export function startBackupWorker(c: BackupWorkerConfig): void {
  stopBackupWorker()
  config = c
  isRunning = true
  backoff.reset()
  const interval = c.intervalMs ?? DEFAULT_BACKUP_INTERVAL_MS

  backupTimer = setInterval(performBackup, interval)
}

export function stopBackupWorker(): void {
  isRunning = false
  if (backupTimer) {
    clearInterval(backupTimer)
    backupTimer = null
  }
  config = null
  backoff.reset()
}

export function triggerBackupNow(): void {
  if (!config || !isRunning) return
  config.onBackupStart?.()
  api.backups
    .exportToDisk({ workspace_id: config.workspaceId })
    .then((result) => config?.onBackupComplete?.(result ?? { path: '' }))
    .catch((err) => config?.onBackupError?.(err instanceof Error ? err : new Error(String(err))))
}

export function isBackupWorkerRunning(): boolean {
  return isRunning
}
