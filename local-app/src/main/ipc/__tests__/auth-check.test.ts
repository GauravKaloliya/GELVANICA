import { describe, it, expect, vi } from 'vitest'
import { authCheckMiddleware } from '../middleware/auth-check'
import type { MiddlewareContext } from '../middleware/types'

function createCtx(channel: string): MiddlewareContext {
  return { channel, event: {} as never, args: [] }
}

describe('authCheckMiddleware', () => {
  it('allows public channels without auth', async () => {
    const getTokens = vi.fn().mockReturnValue(null)
    const middleware = authCheckMiddleware(getTokens)
    const next = vi.fn().mockResolvedValue('ok')
    const result = await middleware(createCtx('auth:open-webview'), next)
    expect(result).toBe('ok')
  })

  it('allows settings channels without auth', async () => {
    const getTokens = vi.fn().mockReturnValue(null)
    const middleware = authCheckMiddleware(getTokens)
    const next = vi.fn().mockResolvedValue('ok')
    const result = await middleware(createCtx('settings:get'), next)
    expect(result).toBe('ok')
  })

  it('blocks non-public channels without auth', async () => {
    const getTokens = vi.fn().mockReturnValue(null)
    const middleware = authCheckMiddleware(getTokens)
    const next = vi.fn()
    await expect(middleware(createCtx('entity:list'), next)).rejects.toThrow('Authentication required')
  })

  it('allows authenticated channels with valid token', async () => {
    const getTokens = vi.fn().mockReturnValue({ access_token: 'valid-token' })
    const middleware = authCheckMiddleware(getTokens)
    const next = vi.fn().mockResolvedValue('ok')
    const result = await middleware(createCtx('entity:list'), next)
    expect(result).toBe('ok')
  })

  it('blocks channels with empty token', async () => {
    const getTokens = vi.fn().mockReturnValue({ access_token: '' })
    const middleware = authCheckMiddleware(getTokens)
    const next = vi.fn()
    await expect(middleware(createCtx('entity:list'), next)).rejects.toThrow('Authentication required')
  })

  it('allows version:info without auth', async () => {
    const getTokens = vi.fn().mockReturnValue(null)
    const middleware = authCheckMiddleware(getTokens)
    const next = vi.fn().mockResolvedValue('ok')
    const result = await middleware(createCtx('version:info'), next)
    expect(result).toBe('ok')
  })
})
