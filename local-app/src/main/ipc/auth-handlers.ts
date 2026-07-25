import { BrowserWindow } from 'electron'
import { AuthService } from '../auth-service'
import { safeHandle } from './handler-wrapper'
import { env } from '@main/env'

function desktopAuthUrl(): string {
  const url = new URL(env.AUTH_URL)
  url.searchParams.set('source', 'desktop')
  return url.toString()
}

export function registerAuthHandlers(authService: AuthService): void {
  let authWindow: BrowserWindow | null = null

  safeHandle('auth:open-webview', async () => {
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.focus()
      return
    }
    authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
      title: 'GNOVIUM Authentication',
      autoHideMenuBar: true,
    })
    authWindow.loadURL(desktopAuthUrl())
    authWindow.on('closed', () => {
      authWindow = null
    })
  })

  safeHandle('auth:exchange-code', async (_event, args: { code: string }) => {
    try {
      // Validate code format
      if (!args.code || !/^[a-zA-Z0-9_-]{1,500}$/.test(args.code)) {
        return { error: 'Invalid authorization code format' }
      }

      if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close()
        authWindow = null
      }
      const result = await authService.exchangeCode(args.code)
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('auth:status-changed', { authenticated: true, user: result.user })
      })
      return result
    } catch {
      return { error: 'Exchange failed — server may be offline' }
    }
  })

  safeHandle('auth:get-profile', async () => {
    const user = authService.getUser()
    if (user) return { user }
    const profile = await authService.fetchProfile()
    return { user: profile }
  })

  safeHandle('auth:get-tokens', async () => {
    const tokens = authService.getTokens()
    return { tokens: { access_token: tokens?.access_token } }
  })

  safeHandle('auth:refresh', async () => {
    const refreshed = await authService.refreshTokens()
    return { refreshed }
  })

  safeHandle('auth:status', async () => {
    const tokens = authService.getTokens()
    const user = authService.getUser()
    return {
      authenticated: !!tokens?.access_token,
      user,
    }
  })

  safeHandle('auth:logout', async () => {
    await authService.logout()
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('auth:status-changed', { authenticated: false })
    })
  })

  safeHandle('auth:update-profile', async (_event, args: { name?: string; avatar_url?: string }) => {
    const user = await authService.updateProfile(args)
    if (!user) return { error: 'Failed to update profile — must be online' }
    return { user }
  })

  safeHandle('auth:is-online', async () => {
    return { online: await authService.isOnline() }
  })
}
