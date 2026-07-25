import { api } from '@lib/api'
import { rendererLogger } from '@lib/logger'
import { ExponentialBackoff } from './backoff'

/**
 * Renderer-process poller for notification polling.
 * Not a true Web Worker — runs on the main thread via setInterval.
 * Uses renderer-process polling. For production, consider Electron utilityProcess.
 */
let isRunning = false
let pollTimer: ReturnType<typeof setInterval> | null = null

const POLL_INTERVAL_MS = 15_000
const backoff = new ExponentialBackoff()

interface NotificationSnapshot {
  id: string
  is_read: boolean
  title: string
  message?: string
  type: string
}

export interface NotificationWorkerConfig {
  workspaceId?: string
  intervalMs?: number
  onNewNotification?: (notification: { id: string; title: string; message?: string; type: string }) => void
  onNotificationReadStatusChanged?: (notification: { id: string; title: string; read: boolean; type: string }) => void
  onNotificationRemoved?: (notification: { id: string }) => void
  onError?: (error: Error) => void
}

let config: NotificationWorkerConfig | null = null
let previousNotifications: Map<string, NotificationSnapshot> = new Map()

function buildSnapshotMap(list: NotificationSnapshot[]): Map<string, NotificationSnapshot> {
  const map = new Map<string, NotificationSnapshot>()
  for (const n of list) {
    map.set(n.id, n)
  }
  return map
}

async function pollNotifications(): Promise<void> {
  if (!config || !isRunning) return
  try {
    const notifications = await api.notifications.list(
      config.workspaceId ? { workspace_id: config.workspaceId } : undefined
    )
    const list: NotificationSnapshot[] = Array.isArray(notifications)
      ? notifications.map((n) => ({
          id: n.id,
          is_read: n.is_read,
          title: n.title,
          message: n.message ?? undefined,
          type: n.type,
        }))
      : []

    const currentMap = buildSnapshotMap(list)
    const previousMap = previousNotifications

    if (previousMap.size > 0) {
      for (const [id, current] of currentMap) {
        const prev = previousMap.get(id)
        if (!prev) {
          config.onNewNotification?.({
            id: current.id,
            title: current.title,
            message: current.message ?? undefined,
            type: current.type,
          })
        } else if (prev.is_read !== current.is_read) {
          config.onNotificationReadStatusChanged?.({
            id: current.id,
            title: current.title,
            read: current.is_read,
            type: current.type,
          })
        }
      }

      for (const [id] of previousMap) {
        if (!currentMap.has(id)) {
          config.onNotificationRemoved?.({ id })
        }
      }
    }

    previousNotifications = currentMap
    backoff.reset()
  } catch (err) {
    config.onError?.(err instanceof Error ? err : new Error(String(err)))
    rendererLogger.error('NotificationWorker', 'Poll failed, backing off', {
      message: err instanceof Error ? err.message : String(err),
      delay: backoff.currentDelay,
    })
    scheduleRetry()
  }
}

function scheduleRetry(): void {
  if (!config || !isRunning) return
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  pollTimer = setInterval(pollNotifications, backoff.next())
}

export function startNotificationWorker(c: NotificationWorkerConfig): void {
  stopNotificationWorker()
  config = c
  isRunning = true
  previousNotifications = new Map()
  backoff.reset()
  const interval = c.intervalMs ?? POLL_INTERVAL_MS

  pollTimer = setInterval(pollNotifications, interval)
}

export function stopNotificationWorker(): void {
  isRunning = false
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  config = null
  previousNotifications = new Map()
  backoff.reset()
}

export function isNotificationWorkerRunning(): boolean {
  return isRunning
}
