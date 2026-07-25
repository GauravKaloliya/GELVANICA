import { describe, it, expect, vi } from 'vitest'
import { rateLimitMiddleware } from '../middleware/rate-limit'
import type { MiddlewareContext } from '../middleware/types'

function createCtx(channel = 'test:channel'): MiddlewareContext {
  return { channel, event: {} as never, args: [] }
}

describe('rateLimitMiddleware', () => {
  it('allows requests under the limit', async () => {
    const middleware = rateLimitMiddleware()
    const next = vi.fn().mockResolvedValue('ok')
    const result = await middleware(createCtx(), next)
    expect(result).toBe('ok')
  })

  it('allows 100 requests per window', async () => {
    const middleware = rateLimitMiddleware()
    const next = vi.fn().mockResolvedValue('ok')
    for (let i = 0; i < 100; i++) {
      await middleware(createCtx('rate-limit-test'), next)
    }
    expect(next).toHaveBeenCalledTimes(100)
  })

  it('blocks request 101 within same window', async () => {
    const middleware = rateLimitMiddleware()
    const next = vi.fn().mockResolvedValue('ok')
    for (let i = 0; i < 100; i++) {
      await middleware(createCtx('rate-limit-test-2'), next)
    }
    await expect(middleware(createCtx('rate-limit-test-2'), next)).rejects.toThrow()
  })

  it('tracks different channels separately', async () => {
    const middleware = rateLimitMiddleware()
    const next = vi.fn().mockResolvedValue('ok')
    for (let i = 0; i < 100; i++) {
      await middleware(createCtx('channel-a'), next)
    }
    // channel-b should still work
    const result = await middleware(createCtx('channel-b'), next)
    expect(result).toBe('ok')
  })
})
