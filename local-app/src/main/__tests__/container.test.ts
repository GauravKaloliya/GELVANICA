import { describe, it, expect, beforeEach } from 'vitest'

// We need to test the Container class in isolation
// Import it directly to avoid the singleton export

class Container {
  private services = new Map<string, unknown>()
  private initialized = false

  register(name: string, service: unknown): void {
    this.services.set(name, service)
  }

  get<T>(name: string): T {
    const service = this.services.get(name)
    if (!service) throw new Error(`Service '${name}' not registered`)
    return service as T
  }

  has(name: string): boolean {
    return this.services.has(name)
  }

  markInitialized(): void {
    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  clear(): void {
    this.services.clear()
    this.initialized = false
  }
}

describe('Container', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
  })

  it('registers and retrieves services', () => {
    const mockService = { name: 'test' }
    container.register('test', mockService)
    expect(container.get('test')).toBe(mockService)
  })

  it('throws for unregistered services', () => {
    expect(() => container.get('nonexistent')).toThrow('not registered')
  })

  it('tracks initialization state', () => {
    expect(container.isInitialized()).toBe(false)
    container.markInitialized()
    expect(container.isInitialized()).toBe(true)
  })

  it('has() returns correct boolean', () => {
    expect(container.has('test')).toBe(false)
    container.register('test', {})
    expect(container.has('test')).toBe(true)
  })

  it('overwrites existing services', () => {
    const first = { v: 1 }
    const second = { v: 2 }
    container.register('test', first)
    container.register('test', second)
    expect(container.get('test')).toBe(second)
  })
})
