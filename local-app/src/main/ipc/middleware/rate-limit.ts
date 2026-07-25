import { RateLimitError } from '../../../shared/errors'
import type { Middleware } from './types'

const IPC_RATE_LIMIT_WINDOW_MS = 1_000
const IPC_RATE_LIMIT_MAX = 100
const callCounts = new Map<string, { count: number; windowStart: number }>()

export function rateLimitMiddleware(): Middleware {
  return async (ctx, next) => {
    const now = Date.now()
    const entry = callCounts.get(ctx.channel)

    if (!entry || now - entry.windowStart > IPC_RATE_LIMIT_WINDOW_MS) {
      callCounts.set(ctx.channel, { count: 1, windowStart: now })
    } else {
      entry.count++
      if (entry.count > IPC_RATE_LIMIT_MAX) {
        throw new RateLimitError(ctx.channel)
      }
    }

    return next()
  }
}
