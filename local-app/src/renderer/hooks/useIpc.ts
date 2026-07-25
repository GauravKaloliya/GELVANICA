import { useCallback, useRef } from 'react'

type IpcInvoke = (channel: string, ...args: unknown[]) => Promise<unknown>
type IpcSend = (channel: string, ...args: unknown[]) => void
type IpcOn = (channel: string, listener: (...args: unknown[]) => void) => () => void
type IpcOnce = (channel: string, listener: (...args: unknown[]) => void) => void
type IpcRemoveAll = (channel: string) => void

interface IpcMethods {
  invoke: IpcInvoke
  send: IpcSend
  on: IpcOn
  once: IpcOnce
  removeAllListeners: IpcRemoveAll
}

function getGnovium(): typeof window.gnovium {
  return window.gnovium
}

export function useIpc() {
  const listenersRef = useRef<Array<() => void>>([])

  const invoke: IpcInvoke = useCallback(
    async (channel, ...args) => {
      return getGnovium().ipc.invoke(channel, ...args)
    },
    []
  )

  const send: IpcSend = useCallback((channel, ...args) => {
    getGnovium().ipc.send(channel, ...args)
  }, [])

  const on: IpcOn = useCallback((channel, listener) => {
    const cleanup = getGnovium().ipc.on(channel, listener)
    listenersRef.current.push(cleanup)
    return () => {
      cleanup()
      listenersRef.current = listenersRef.current.filter((fn) => fn !== cleanup)
    }
  }, [])

  const once: IpcOnce = useCallback((channel, listener) => {
    getGnovium().ipc.once(channel, listener)
  }, [])

  const removeAllListeners: IpcRemoveAll = useCallback((channel) => {
    getGnovium().ipc.removeAllListeners(channel)
  }, [])

  const cleanupAll = useCallback(() => {
    listenersRef.current.forEach((cleanup) => cleanup())
    listenersRef.current = []
  }, [])

  return {
    invoke,
    send,
    on,
    once,
    removeAllListeners,
    cleanupAll,
    gnovium: getGnovium(),
  } satisfies IpcMethods & { cleanupAll: () => void; gnovium: typeof window.gnovium }
}
