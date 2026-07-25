import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/config/defaults'

describe('Settings defaults', () => {
  it('has all 10 categories', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('general')
    expect(DEFAULT_SETTINGS).toHaveProperty('editor')
    expect(DEFAULT_SETTINGS).toHaveProperty('appearance')
    expect(DEFAULT_SETTINGS).toHaveProperty('ai')
    expect(DEFAULT_SETTINGS).toHaveProperty('performance')
    expect(DEFAULT_SETTINGS).toHaveProperty('backups')
    expect(DEFAULT_SETTINGS).toHaveProperty('privacy')
    expect(DEFAULT_SETTINGS).toHaveProperty('sync')
    expect(DEFAULT_SETTINGS).toHaveProperty('advanced')
    expect(DEFAULT_SETTINGS).toHaveProperty('keyboard_shortcuts')
  })

  it('auto-save interval is 30 seconds', () => {
    expect(DEFAULT_SETTINGS.general.auto_save_interval).toBe(30)
  })

  it('default theme is dark', () => {
    expect(DEFAULT_SETTINGS.appearance.theme).toBe('dark')
  })
})
