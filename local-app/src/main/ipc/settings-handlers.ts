import path from 'node:path'
import { app } from 'electron'
import { safeHandle } from './handler-wrapper'
import { readSettings, writeSettings } from './flask-client'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/config/defaults'
import { env } from '@main/env'
import { requireString } from './validate'

const ALLOWED_SETTINGS_KEYS = new Set([
  'general', 'editor', 'appearance', 'ai', 'performance',
  'backups', 'privacy', 'sync', 'advanced', 'keyboard_shortcuts',
])

function getDefaultSettingsWithHome(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    backups: { ...DEFAULT_SETTINGS.backups, export_path: path.join(app.getPath('home'), 'GNOVIUM-Backups') },
    sync: { ...DEFAULT_SETTINGS.sync, server_url: DEFAULT_SETTINGS.sync.server_url || env.SERVER_URL },
  }
}

function applyEnvDefaults(settings: Partial<AppSettings>): AppSettings {
  const sync = settings.sync ?? DEFAULT_SETTINGS.sync
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    sync: { ...sync, server_url: sync.server_url || env.SERVER_URL },
  } as AppSettings
}

export function registerSettingsHandlers(): void {
  safeHandle('settings:get-all', async () => {
    return applyEnvDefaults(await readSettings())
  })

  safeHandle('settings:get', async (_event, key: string) => {
    const settings = applyEnvDefaults(await readSettings())
    const keys = key.split('.')
    let value: unknown = settings
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k]
      } else {
        return undefined
      }
    }
    return value
  })

  safeHandle('settings:set', async (_event, key: string, value: unknown) => {
    requireString(key, 'key', { maxLength: 100 })
    const keys = key.split('.')
    const topLevel = keys[0]
    if (!topLevel || !ALLOWED_SETTINGS_KEYS.has(topLevel)) {
      throw new Error(`Settings key "${topLevel}" is not allowed`)
    }
    const settings = await readSettings()
    let target: Record<string, unknown> = settings as Record<string, unknown>

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]!
      if (!(k in target) || typeof target[k] !== 'object' || target[k] === null) {
        target[k] = {}
      }
      target = target[k] as Record<string, unknown>
    }

    target[keys[keys.length - 1]!] = value
    await writeSettings(settings)
  })

  safeHandle('settings:reset', async () => {
    const defaults = getDefaultSettingsWithHome()
    await writeSettings(defaults)
    return defaults
  })
}
