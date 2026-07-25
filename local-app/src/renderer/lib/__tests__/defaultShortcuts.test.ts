import { describe, it, expect } from 'vitest'
import { DEFAULT_SHORTCUTS } from '@lib/defaultShortcuts'

describe('Default keyboard shortcuts', () => {
  it('has at least 30 shortcuts', () => {
    expect(DEFAULT_SHORTCUTS.length).toBeGreaterThanOrEqual(30)
  })

  it('each shortcut has unique id', () => {
    const ids = DEFAULT_SHORTCUTS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each shortcut has category', () => {
    DEFAULT_SHORTCUTS.forEach(s => {
      expect(s.category).toBeTruthy()
    })
  })
})
