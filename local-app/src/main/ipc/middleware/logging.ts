import { logger } from '../../logger'
import type { Middleware } from './types'

export function loggingMiddleware(): Middleware {
  return async (ctx, next) => {
    const start = Date.now()
    try {
      const result = await next()
      const elapsed = Date.now() - start
      logger.debug('IPC', `${ctx.channel} completed (${elapsed}ms)`)
      return result
    } catch (error) {
      const elapsed = Date.now() - start
      logger.warn('IPC', `${ctx.channel} failed (${elapsed}ms): ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
}
