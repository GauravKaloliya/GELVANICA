import { safeInvoke, safeOn } from '../safe-ipc'
import type { AuthExchangeResponse } from '../../shared/types'
import type { AuthStatus } from '../../shared/types/electron'
import type { User, AuthTokens } from '../types'

export const authAPI = {
  openWebview: (): Promise<void> => safeInvoke('auth:open-webview') as Promise<void>,

  exchangeCode: (code: string): Promise<AuthExchangeResponse> =>
    safeInvoke('auth:exchange-code', { code }) as Promise<AuthExchangeResponse>,

  getProfile: (): Promise<{ user: User | null }> =>
    safeInvoke('auth:get-profile') as Promise<{ user: User | null }>,

  getTokens: (): Promise<{ tokens: AuthTokens | null }> =>
    safeInvoke('auth:get-tokens') as Promise<{ tokens: AuthTokens | null }>,

  logout: (): Promise<void> => safeInvoke('auth:logout') as Promise<void>,

  updateProfile: (data: { name?: string; avatar_url?: string }): Promise<unknown> =>
    safeInvoke('auth:update-profile', data),

  isOnline: (): Promise<{ online: boolean }> =>
    safeInvoke('auth:is-online') as Promise<{ online: boolean }>,

  refresh: (): Promise<{ refreshed: boolean }> =>
    safeInvoke('auth:refresh') as Promise<{ refreshed: boolean }>,

  status: (): Promise<AuthStatus> =>
    safeInvoke('auth:status') as Promise<AuthStatus>,

  onStatusChanged: (listener: (data: { authenticated: boolean; user?: User }) => void) =>
    safeOn('auth:status-changed', listener as (...args: unknown[]) => void),

  onCodeReceived: (listener: (data: { code: string }) => void) =>
    safeOn('auth:code-received', listener as (...args: unknown[]) => void),
}
