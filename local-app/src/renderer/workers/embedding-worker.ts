import { rendererLogger } from '@lib/logger'
import { ExponentialBackoff } from './backoff'

/**
 * Renderer-process poller for embedding queue processing.
 * Not a true Web Worker — runs on the main thread.
 * Uses renderer-process polling. For production, consider Electron utilityProcess.
 */
const EMBEDDING_INTERVAL_MS = 5_000
const EMBEDDING_BATCH_SIZE = 10
let isRunning = false
let embeddingTimer: ReturnType<typeof setInterval> | null = null
let queue: string[] = []
const backoff = new ExponentialBackoff()

export interface EmbeddingWorkerConfig {
  workspaceId: string
  onEmbeddingComplete?: (entityId: string) => void
  onBatchComplete?: (count: number) => void
  onError?: (error: Error) => void
}

let config: EmbeddingWorkerConfig | null = null

export function startEmbeddingWorker(c: EmbeddingWorkerConfig): void {
  if (isRunning) return
  stopEmbeddingWorker()
  config = c
  isRunning = true
  backoff.reset()
  embeddingTimer = setInterval(async () => {
    await processEmbeddingQueue()
  }, EMBEDDING_INTERVAL_MS)
}

export function stopEmbeddingWorker(): void {
  isRunning = false
  if (embeddingTimer) {
    clearInterval(embeddingTimer)
    embeddingTimer = null
  }
  config = null
  queue = []
  backoff.reset()
}

export function enqueueEntityForEmbedding(entityId: string): void {
  if (!queue.includes(entityId)) {
    queue.push(entityId)
  }
}

async function processEmbeddingQueue(): Promise<void> {
  if (!isRunning || !config || queue.length === 0) return

  const batch = queue.splice(0, EMBEDDING_BATCH_SIZE)
  let completed = 0

  for (const entityId of batch) {
    try {
      await window.gnovium.ipc.invoke('ai:generate-embedding', entityId)
      config.onEmbeddingComplete?.(entityId)
      completed++
      backoff.reset()
    } catch (err) {
      rendererLogger.error('EmbeddingWorker', `Failed to generate embedding for ${entityId}`, {
        message: err instanceof Error ? err.message : String(err),
      })
      queue.push(entityId)
      config.onError?.(err instanceof Error ? err : new Error(String(err)))
      const delay = backoff.next()
      rendererLogger.warn('EmbeddingWorker', `Backing off ${delay}ms due to failure`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  if (completed > 0) {
    config.onBatchComplete?.(completed)
  }
}

export function getEmbeddingQueueSize(): number {
  return queue.length
}

export function isEmbeddingWorkerRunning(): boolean {
  return isRunning
}
