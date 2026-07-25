import { api } from '@lib/api'
import { rendererLogger } from '@lib/logger'
import { ExponentialBackoff } from './backoff'

/**
 * Renderer-process poller for orphan file cleanup.
 * Not a true Web Worker — runs on the main thread via setInterval.
 * Uses renderer-process polling. For production, consider Electron utilityProcess.
 */
let isRunning = false
let cleanupTimer: ReturnType<typeof setInterval> | null = null

const CLEANUP_INTERVAL_MS = 3_600_000
const backoff = new ExponentialBackoff()

export interface CleanupWorkerConfig {
  workspaceId?: string
  intervalMs?: number
  onCleanupStart?: () => void
  onCleanupComplete?: (result: { orphansRemoved: number }) => void
  onCleanupError?: (error: Error) => void
}

let config: CleanupWorkerConfig | null = null

async function performCleanup(): Promise<void> {
  if (!config || !isRunning) return
  try {
    config.onCleanupStart?.()
    const result = await api.files.cleanupOrphans(
      config.workspaceId ? { workspace_id: config.workspaceId } : undefined
    )
    config.onCleanupComplete?.({ orphansRemoved: result?.deleted ?? 0 })
    backoff.reset()
  } catch (err) {
    config.onCleanupError?.(err instanceof Error ? err : new Error(String(err)))
    rendererLogger.error('CleanupWorker', 'Cleanup failed, backing off', {
      message: err instanceof Error ? err.message : String(err),
      delay: backoff.currentDelay,
    })
    scheduleRetry()
  }
}

function scheduleRetry(): void {
  if (!config || !isRunning) return
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  cleanupTimer = setInterval(performCleanup, backoff.next())
}

export function startCleanupWorker(c: CleanupWorkerConfig): void {
  stopCleanupWorker()
  config = c
  isRunning = true
  backoff.reset()
  const interval = c.intervalMs ?? CLEANUP_INTERVAL_MS

  cleanupTimer = setInterval(performCleanup, interval)
}

export function stopCleanupWorker(): void {
  isRunning = false
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  config = null
  backoff.reset()
}

export function triggerCleanupNow(): void {
  if (!config || !isRunning) return
  config.onCleanupStart?.()
  api.files
    .cleanupOrphans(config.workspaceId ? { workspace_id: config.workspaceId } : undefined)
    .then((result) => config?.onCleanupComplete?.({ orphansRemoved: result?.deleted ?? 0 }))
    .catch((err) => config?.onCleanupError?.(err instanceof Error ? err : new Error(String(err))))
}

export function isCleanupWorkerRunning(): boolean {
  return isRunning
}
