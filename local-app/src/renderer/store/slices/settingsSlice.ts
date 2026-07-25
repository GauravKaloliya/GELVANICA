import { StateCreator } from 'zustand'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/config/defaults'
import type { StoreState } from '../index'

export interface SettingsSlice {
  settings: AppSettings
  isLoaded: boolean

  loadSettings: () => Promise<void>
  updateSettings: (partial: Partial<AppSettings>) => void
  resetSettings: () => Promise<void>
}

function mergePartial<T extends Record<string, unknown>>(base: T, partial?: Partial<T>): T {
  return { ...base, ...(partial ?? {}) } as T
}

export const createSettingsSlice: StateCreator<StoreState, [], [], SettingsSlice> = (
  set,
  get
) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const saved = await window.gnovium.settings.getAll()
      if (saved) {
        const merged: AppSettings = {
          general: mergePartial(DEFAULT_SETTINGS.general, saved.general),
          editor: mergePartial(DEFAULT_SETTINGS.editor, saved.editor),
          appearance: mergePartial(DEFAULT_SETTINGS.appearance, saved.appearance),
          ai: mergePartial(DEFAULT_SETTINGS.ai, saved.ai),
          performance: mergePartial(DEFAULT_SETTINGS.performance, saved.performance),
          backups: mergePartial(DEFAULT_SETTINGS.backups, saved.backups),
          privacy: mergePartial(DEFAULT_SETTINGS.privacy, saved.privacy),
          sync: mergePartial(DEFAULT_SETTINGS.sync, saved.sync),
          advanced: mergePartial(DEFAULT_SETTINGS.advanced, saved.advanced),
          keyboard_shortcuts: { ...DEFAULT_SETTINGS.keyboard_shortcuts, ...((saved.keyboard_shortcuts ?? {}) as Record<string, string>) },
        }
        set({ settings: merged, isLoaded: true })
      } else {
        set({ isLoaded: true })
      }
    } catch {
      set({ isLoaded: true })
    }
  },

  updateSettings: (partial) => {
    const current = get().settings
    const next: AppSettings = {
      ...current,
      ...partial,
      general: { ...current.general, ...partial.general },
      editor: { ...current.editor, ...partial.editor },
      appearance: { ...current.appearance, ...partial.appearance },
      ai: { ...current.ai, ...partial.ai },
      performance: { ...current.performance, ...partial.performance },
      backups: { ...current.backups, ...partial.backups },
      privacy: { ...current.privacy, ...partial.privacy },
      sync: { ...current.sync, ...partial.sync },
      advanced: { ...current.advanced, ...partial.advanced },
      keyboard_shortcuts: { ...current.keyboard_shortcuts, ...partial.keyboard_shortcuts },
    }
    set({ settings: next })
  },

  resetSettings: async () => {
    try {
      const fresh = await window.gnovium.settings.reset()
      if (fresh) {
        const merged: AppSettings = {
          general: mergePartial(DEFAULT_SETTINGS.general, fresh.general),
          editor: mergePartial(DEFAULT_SETTINGS.editor, fresh.editor),
          appearance: mergePartial(DEFAULT_SETTINGS.appearance, fresh.appearance),
          ai: mergePartial(DEFAULT_SETTINGS.ai, fresh.ai),
          performance: mergePartial(DEFAULT_SETTINGS.performance, fresh.performance),
          backups: mergePartial(DEFAULT_SETTINGS.backups, fresh.backups),
          privacy: mergePartial(DEFAULT_SETTINGS.privacy, fresh.privacy),
          sync: mergePartial(DEFAULT_SETTINGS.sync, fresh.sync),
          advanced: mergePartial(DEFAULT_SETTINGS.advanced, fresh.advanced),
          keyboard_shortcuts: { ...DEFAULT_SETTINGS.keyboard_shortcuts, ...((fresh.keyboard_shortcuts ?? {}) as Record<string, string>) },
        }
        set({ settings: merged })
      } else {
        set({ settings: DEFAULT_SETTINGS })
      }
    } catch {
      set({ settings: DEFAULT_SETTINGS })
    }
  },
})
