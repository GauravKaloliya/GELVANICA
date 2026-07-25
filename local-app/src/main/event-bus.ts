import { logger } from './logger'

type EventPayload = Record<string, unknown>
type EventHandler<T extends EventPayload = EventPayload> = (payload: T) => void | Promise<void>

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()

  on<T extends EventPayload>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler)

    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler)
    }
  }

  async emit<T extends EventPayload>(event: string, payload: T): Promise<void> {
    const handlers = this.handlers.get(event)
    if (!handlers || handlers.size === 0) return

    logger.debug('EventBus', `Emitting "${event}" to ${handlers.size} handler(s)`)

    const promises: Promise<void>[] = []
    for (const handler of handlers) {
      promises.push(
        Promise.resolve().then(() => handler(payload)).catch((error) => {
          logger.error('EventBus', `Handler error for "${event}"`, error)
        })
      )
    }
    await Promise.allSettled(promises)
  }

  once<T extends EventPayload>(event: string, handler: EventHandler<T>): () => void {
    const unsubscribe = this.on<T>(event, async (payload) => {
      unsubscribe()
      await handler(payload)
    })
    return unsubscribe
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }

  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0
  }
}

export const eventBus = new EventBus()
