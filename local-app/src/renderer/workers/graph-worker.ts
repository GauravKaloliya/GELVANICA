import { api } from '@lib/api'
import { rendererLogger } from '@lib/logger'
import { ExponentialBackoff } from './backoff'

/**
 * Renderer-process poller for graph data refresh.
 * Not a true Web Worker — runs on the main thread via setInterval.
 * Uses renderer-process polling. For production, consider Electron utilityProcess.
 */
let isRunning = false
let refreshTimer: ReturnType<typeof setInterval> | null = null

const GRAPH_REFRESH_INTERVAL_MS = 120_000
const backoff = new ExponentialBackoff()

export interface GraphWorkerConfig {
  workspaceId: string
  onGraphRefresh?: (nodeCount: number, edgeCount: number) => void
  onError?: (error: Error) => void
}

let config: GraphWorkerConfig | null = null

async function performGraphRefresh(): Promise<void> {
  if (!config || !isRunning) return
  try {
    const result = await api.graph.get(config.workspaceId)
    if (result) {
      config.onGraphRefresh?.(
        result.graph_snapshot?.nodes?.length ?? 0,
        result.graph_snapshot?.edges?.length ?? 0
      )
    }
    backoff.reset()
  } catch (err) {
    config.onError?.(err instanceof Error ? err : new Error(String(err)))
    rendererLogger.error('GraphWorker', 'Graph refresh failed, backing off', {
      message: err instanceof Error ? err.message : String(err),
      delay: backoff.currentDelay,
    })
    scheduleRetry()
  }
}

function scheduleRetry(): void {
  if (!config || !isRunning) return
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  refreshTimer = setInterval(performGraphRefresh, backoff.next())
}

export function startGraphWorker(c: GraphWorkerConfig): void {
  stopGraphWorker()
  config = c
  isRunning = true
  backoff.reset()
  refreshTimer = setInterval(performGraphRefresh, GRAPH_REFRESH_INTERVAL_MS)
}

export function stopGraphWorker(): void {
  isRunning = false
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  config = null
  backoff.reset()
}

export function triggerGraphRefresh(): void {
  if (!config || !isRunning) return
  api.graph
    .get(config.workspaceId)
    .then((result) =>
      config?.onGraphRefresh?.(
        result?.graph_snapshot?.nodes?.length ?? 0,
        result?.graph_snapshot?.edges?.length ?? 0
      )
    )
    .catch((err) => config?.onError?.(err instanceof Error ? err : new Error(String(err))))
}

export function isGraphWorkerRunning(): boolean {
  return isRunning
}
