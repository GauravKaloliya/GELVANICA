import { safeInvoke, safeOn } from '../safe-ipc'

export const systemAPI = {
  activity: {
    list: (params?: Record<string, unknown>): Promise<unknown> =>
      safeInvoke('activity:list', params),
  },

  dashboard: {
    overview: (workspaceId: string): Promise<unknown> =>
      safeInvoke('dashboard:overview', workspaceId),
  },

  update: {
    onChecking: (listener: () => void) => safeOn('update:checking', listener),
    onAvailable: (listener: (info: { version: string }) => void) =>
      safeOn('update:available', listener as (...args: unknown[]) => void),
    onNotAvailable: (listener: () => void) => safeOn('update:not-available', listener),
    onProgress: (listener: (info: { percent: number }) => void) =>
      safeOn('update:progress', listener as (...args: unknown[]) => void),
    onDownloaded: (listener: (info: { version: string }) => void) =>
      safeOn('update:downloaded', listener as (...args: unknown[]) => void),
    onError: (listener: (info: { message: string }) => void) =>
      safeOn('update:error', listener as (...args: unknown[]) => void),
  },

  navigation: {
    onNavigate: (listener: (target: string) => void) => {
      const channels = ['navigate:settings', 'navigate:graph', 'navigate:shortcuts', 'navigate:about'] as const
      const cleanups = channels.map((ch) =>
        safeOn(ch, () => {
          const route = ch.replace('navigate:', '')
          listener(route)
        })
      )
      return () => { cleanups.forEach((cleanup) => cleanup()) }
    },
    onToggleSidebar: (listener: () => void) => safeOn('view:toggle-sidebar', listener),
    onToggleAI: (listener: () => void) => safeOn('view:toggle-ai', listener),
  },

  version: {
    info: (): Promise<{ app: string; electron: string; chrome: string }> =>
      safeInvoke('version:info') as Promise<{ app: string; electron: string; chrome: string }>,
  },

  app: {
    getLogDir: (): Promise<string> =>
      safeInvoke('app:get-log-dir') as Promise<string>,
  },
}
