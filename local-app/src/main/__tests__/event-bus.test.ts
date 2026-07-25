import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const { eventBus } = await import('../event-bus')

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.removeAllListeners()
  })

  it('subscribes and receives events', async () => {
    const handler = vi.fn()
    eventBus.on('test', handler)
    await eventBus.emit('test', { data: 'hello' })
    expect(handler).toHaveBeenCalledWith({ data: 'hello' })
  })

  it('supports multiple subscribers', async () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    eventBus.on('multi-test', h1)
    eventBus.on('multi-test', h2)
    await eventBus.emit('multi-test', { data: 'hello' })
    expect(h1).toHaveBeenCalledOnce()
    expect(h2).toHaveBeenCalledOnce()
  })

  it('unsubscribes correctly', async () => {
    const handler = vi.fn()
    const unsub = eventBus.on('unsub-test', handler)
    unsub()
    await eventBus.emit('unsub-test', { data: 'hello' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not call handlers for other events', async () => {
    const handler = vi.fn()
    eventBus.on('event-a', handler)
    await eventBus.emit('event-b', { data: 'hello' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('removes all listeners for an event', async () => {
    const handler = vi.fn()
    eventBus.on('remove-test', handler)
    eventBus.removeAllListeners('remove-test')
    await eventBus.emit('remove-test', { data: 'hello' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('removes all listeners', async () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    eventBus.on('remove-all-a', h1)
    eventBus.on('remove-all-b', h2)
    eventBus.removeAllListeners()
    await eventBus.emit('remove-all-a', { data: 1 })
    await eventBus.emit('remove-all-b', { data: 2 })
    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('returns correct listener count', () => {
    expect(eventBus.listenerCount('count-test')).toBe(0)
    const unsub = eventBus.on('count-test', vi.fn())
    expect(eventBus.listenerCount('count-test')).toBe(1)
    const unsub2 = eventBus.on('count-test', vi.fn())
    expect(eventBus.listenerCount('count-test')).toBe(2)
    unsub()
    expect(eventBus.listenerCount('count-test')).toBe(1)
    unsub2()
    expect(eventBus.listenerCount('count-test')).toBe(0)
  })
})
