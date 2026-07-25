import { describe, it, expect, vi } from 'vitest'

vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ComposeMiddleware only depends on the Middleware type, not electron at runtime
const { composeMiddleware } = await import('../middleware')
type Middleware = (ctx: { channel: string; event: unknown; args: unknown[] }, next: () => Promise<unknown>) => Promise<unknown>

function createMockContext(channel = 'test:channel') {
  return { channel, event: {} as never, args: [] }
}

describe('composeMiddleware', () => {
  it('calls handler when no middleware', async () => {
    const runner = composeMiddleware([])
    const handler = vi.fn().mockResolvedValue('result')
    const result = await runner(createMockContext(), handler)
    expect(result).toBe('result')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('executes middleware in order', async () => {
    const order: string[] = []
    const m1: Middleware = async (_ctx, next) => {
      order.push('m1-before')
      const result = await next()
      order.push('m1-after')
      return result
    }
    const m2: Middleware = async (_ctx, next) => {
      order.push('m2-before')
      const result = await next()
      order.push('m2-after')
      return result
    }
    const runner = composeMiddleware([m1, m2])
    const handler = vi.fn().mockResolvedValue('done')
    await runner(createMockContext(), handler)
    expect(order).toEqual(['m1-before', 'm2-before', 'm2-after', 'm1-after'])
  })

  it('allows middleware to short-circuit', async () => {
    const m1: Middleware = async (_ctx, _next) => 'short-circuited'
    const runner = composeMiddleware([m1])
    const handler = vi.fn()
    const result = await runner(createMockContext(), handler)
    expect(result).toBe('short-circuited')
    expect(handler).not.toHaveBeenCalled()
  })

  it('propagates errors through middleware', async () => {
    const m1: Middleware = async (_ctx, next) => {
      try {
        return await next()
      } catch (e) {
        return `caught: ${(e as Error).message}`
      }
    }
    const runner = composeMiddleware([m1])
    const handler = vi.fn().mockRejectedValue(new Error('fail'))
    const result = await runner(createMockContext(), handler)
    expect(result).toBe('caught: fail')
  })

  it('prevents next() from being called multiple times', async () => {
    const m1: Middleware = async (_ctx, next) => {
      await next()
      return next() // should throw
    }
    const runner = composeMiddleware([m1])
    await expect(runner(createMockContext(), vi.fn().mockResolvedValue('ok'))).rejects.toThrow(
      'next() called multiple times'
    )
  })
})
