import { safeInvoke, safeSend, safeOn, safeOnce, safeRemoveAllListeners } from '../safe-ipc'
import type { AppSettings } from '../types'
import { authAPI } from './auth'
import { filesystemAPI } from './filesystem'

export const coreAPI = {
  auth: authAPI,

  filesystem: filesystemAPI,

  dialog: {
    showOpenDialog: (options: { title?: string; defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string[]> =>
      safeInvoke('dialog:open-file', options) as Promise<string[]>,
    showSaveDialog: (options: { title?: string; defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null> =>
      safeInvoke('dialog:save-file', options) as Promise<string | null>,
  },

  clipboard: {
    writeText: (text: string): void => safeSend('clipboard:write-text', text),
    readText: (): Promise<string> => safeInvoke('clipboard:read-text') as Promise<string>,
  },

  notifications: {
    show: (title: string, body: string): void => safeSend('notifications:show', title, body),
    list: (): Promise<unknown> => safeInvoke('notifications:list'),
    markRead: (id: string): Promise<unknown> => safeInvoke('notifications:mark-read', id),
    dismiss: (id: string): Promise<unknown> => safeInvoke('notifications:dismiss', id),
  },

  ipc: {
    send: (channel: string, ...args: unknown[]): void => safeSend(channel, ...args),
    invoke: (channel: string, ...args: unknown[]): Promise<unknown> => safeInvoke(channel, ...args),
    on: (channel: string, listener: (...args: unknown[]) => void): (() => void) =>
      safeOn(channel, listener),
    once: (channel: string, listener: (...args: unknown[]) => void): void =>
      safeOnce(channel, listener),
    removeAllListeners: (channel: string): void =>
      safeRemoveAllListeners(channel),
  },

  settings: {
    get: (key: string): Promise<unknown> => safeInvoke('settings:get', key),
    set: (key: string, value: unknown): Promise<void> =>
      safeInvoke('settings:set', key, value) as Promise<void>,
    getAll: (): Promise<Partial<AppSettings>> =>
      safeInvoke('settings:get-all') as Promise<Partial<AppSettings>>,
    reset: (): Promise<AppSettings> => safeInvoke('settings:reset') as Promise<AppSettings>,
  },

  window: {
    minimize: (): void => safeSend('window:minimize'),
    maximize: (): void => safeSend('window:maximize'),
    close: (): void => safeSend('window:close'),
    setTitle: (title: string): void => safeSend('window:set-title', title),
  },

  sync: {
    getStatus: (): Promise<unknown> => safeInvoke('sync:status'),
    triggerSync: (): Promise<unknown> => safeInvoke('sync:trigger'),
    onStatusChanged: (listener: (data: unknown) => void) =>
      safeOn('sync:status-changed', listener as (...args: unknown[]) => void),
  },
}
