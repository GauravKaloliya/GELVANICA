import { ipcRenderer } from 'electron'
import { INVOKE_CHANNELS, SEND_CHANNELS, RECEIVE_CHANNELS } from './channels'

export function safeInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
  if (!INVOKE_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`[Preload] Blocked invoke on unknown channel: ${channel}`))
  }
  return ipcRenderer.invoke(channel, ...args)
}

export function safeSend(channel: string, ...args: unknown[]): void {
  if (!SEND_CHANNELS.has(channel)) {
    throw new Error(`[Preload] Blocked send on unknown channel: ${channel}`)
  }
  ipcRenderer.send(channel, ...args)
}

export function safeOn(channel: string, listener: (...args: unknown[]) => void): () => void {
  if (!RECEIVE_CHANNELS.has(channel)) {
    console.warn(`[Preload] Blocked on for unknown channel: ${channel}`)
    return () => {}
  }
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => listener(...args)
  ipcRenderer.on(channel, handler)
  return () => { ipcRenderer.removeListener(channel, handler) }
}

export function safeOnce(channel: string, listener: (...args: unknown[]) => void): void {
  if (!RECEIVE_CHANNELS.has(channel)) {
    console.warn(`[Preload] Blocked once for unknown channel: ${channel}`)
    return
  }
  ipcRenderer.once(channel, (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args))
}

export function safeRemoveAllListeners(channel: string): void {
  if (!RECEIVE_CHANNELS.has(channel)) {
    console.warn(`[Preload] Blocked removeAllListeners for unknown channel: ${channel}`)
    return
  }
  ipcRenderer.removeAllListeners(channel)
}
