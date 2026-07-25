import { contextBridge } from 'electron'
import { safeInvoke, safeSend, safeOn, safeOnce, safeRemoveAllListeners } from './safe-ipc'
import { gnoviumAPI } from './api'

const electronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => safeSend(channel, ...args),
    invoke: (channel: string, ...args: unknown[]) => safeInvoke(channel, ...args),
    on: (channel: string, listener: (...args: unknown[]) => void) =>
      safeOn(channel, listener),
    once: (channel: string, listener: (...args: unknown[]) => void) =>
      safeOnce(channel, listener),
    removeAllListeners: (channel: string) => safeRemoveAllListeners(channel),
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('gnovium', gnoviumAPI)
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error('[Preload] Failed to expose API:', error)
  }
} else {
  window.gnovium = gnoviumAPI
  window.electron = electronAPI
}

export type { gnoviumAPI }
