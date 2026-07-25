import { app, safeStorage } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { flaskGet, flaskPost, flaskPatch } from './ipc/flask-client'
import { logger } from './logger'
import { eventBus } from './event-bus'
import { env } from '@main/env'
import type { AuthTokens, User } from '../shared/types'

interface TokenPayload {
  exp: number
  iat: number
  sub: string
}

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

function unwrapApiData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function unwrapUser(payload: unknown): User {
  const data = unwrapApiData<User | { user: User }>(payload)
  if (data && typeof data === 'object' && 'user' in data) {
    return (data as { user: User }).user
  }
  return data as User
}

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]!
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(decoded) as TokenPayload
  } catch {
    logger.warn('AuthService', 'decodeJwtPayload failed', { error: 'Parse error' })
    return null
  }
}

export class AuthService {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private tokens: AuthTokens | null = null
  private user: User | null = null
  private authFilePath: string

  constructor() {
    this.authFilePath = path.join(app.getPath('userData'), 'auth.json')
  }

  getTokens(): AuthTokens | null {
    if (this.tokens && this.isTokenExpired(this.tokens.access_token)) {
      // Token is expired — trigger async refresh but return null for now
      this.refreshTokens().catch((e) => logger.error('AuthService', 'Auto-refresh failed', e))
      return null
    }
    return this.tokens
  }

  getUser(): User | null {
    return this.user
  }

  isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token)
    if (!payload) return true
    const expiresAt = payload.exp * 1000
    return Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS
  }

  // --- Encrypted file storage ---

  async loadFromStorage(): Promise<boolean> {
    try {
      const encrypted = await fs.readFile(this.authFilePath)
      if (!safeStorage.isEncryptionAvailable()) {
        logger.error('AuthService', 'Encryption not available')
        return false
      }
      const decrypted = safeStorage.decryptString(encrypted)
      const data = JSON.parse(decrypted) as { tokens: AuthTokens; user: User }
      if (!data.tokens?.access_token || !data.user?.id) return false
      this.tokens = data.tokens
      this.user = data.user
      this.scheduleRefresh(this.tokens.access_token)
      return true
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err?.code !== 'ENOENT') {
        logger.warn('AuthService', 'Failed to load auth from storage:', err?.message ?? error)
      }
      return false
    }
  }

  async saveToStorage(): Promise<void> {
    if (!this.tokens || !this.user) return
    if (!safeStorage.isEncryptionAvailable()) {
      logger.error('AuthService', 'Encryption not available, not saving tokens')
      return
    }
    const data = JSON.stringify({ tokens: this.tokens, user: this.user })
    const encrypted = safeStorage.encryptString(data)
    await fs.writeFile(this.authFilePath, encrypted)
  }

  async clearStorage(): Promise<void> {
    try {
      await fs.unlink(this.authFilePath)
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err?.code !== 'ENOENT') {
        logger.warn('AuthService', 'clearStorage: failed to delete auth file', err?.message ?? error)
      }
    }
    this.tokens = null
    this.user = null
    this.cancelRefresh()
  }

  // --- Auth operations ---

  async exchangeCode(code: string): Promise<{ tokens: AuthTokens; user: User }> {
    const response = await flaskPost<{ tokens: AuthTokens; user: User }>('/api/v1/auth/exchange', { code })
    if (!response.ok) throw new Error(response.error ?? 'Code exchange failed')
    const result = unwrapApiData<{ tokens: AuthTokens; user: User }>(response.data)
    this.tokens = result.tokens
    this.user = result.user
    await this.saveToStorage()
    this.scheduleRefresh(this.tokens.access_token)
    eventBus.emit('auth:status-changed', { authenticated: true, user: this.user })
    return { tokens: this.tokens, user: this.user }
  }

  async refreshTokens(): Promise<boolean> {
    if (!this.tokens?.refresh_token) return false
    if (!this.isTokenExpired(this.tokens.access_token)) {
      this.scheduleRefresh(this.tokens.access_token)
      return true
    }
    try {
      const response = await flaskPost<{ access_token: string }>('/api/v1/auth/refresh', undefined, this.tokens.refresh_token)
      if (!response.ok) throw new Error(response.error ?? 'Token refresh failed')
      const newAccessToken = unwrapApiData<{ access_token: string }>(response.data).access_token
      this.tokens = { access_token: newAccessToken, refresh_token: this.tokens.refresh_token }
      await this.saveToStorage()
      this.scheduleRefresh(newAccessToken)
      return true
    } catch {
      logger.warn('AuthService', 'refreshTokens: token refresh failed')
      await this.clearStorage()
      return false
    }
  }

  async fetchProfile(): Promise<User | null> {
    if (!this.tokens?.access_token) return null
    try {
      const response = await flaskGet<User>('/api/v1/auth/me', this.tokens.access_token)
      if (!response.ok) return null
      this.user = unwrapUser(response.data)
      await this.saveToStorage()
      return this.user
    } catch {
      logger.warn('AuthService', 'fetchProfile: failed to fetch profile')
      return null
    }
  }

  async updateProfile(data: { name?: string; avatar_url?: string }): Promise<User | null> {
    if (!this.tokens?.access_token) return null
    try {
      const response = await flaskPatch<User>('/api/v1/auth/me', data, this.tokens.access_token)
      if (!response.ok) return null
      this.user = unwrapUser(response.data)
      return this.user
    } catch {
      logger.warn('AuthService', 'updateProfile: failed to update profile')
      return null
    }
  }

  async logout(): Promise<void> {
    if (this.tokens?.refresh_token) {
      try {
        await flaskPost('/api/v1/auth/logout', undefined, this.tokens.refresh_token)
      } catch {
        logger.warn('AuthService', 'logout: server may be offline')
      }
    }
    await this.clearStorage()
    eventBus.emit('auth:status-changed', { authenticated: false, user: null })
  }

  async isOnline(): Promise<boolean> {
    try {
      const res = await fetch(env.FLASK_HEALTH_URL, { method: 'GET' })
      return res.ok
    } catch {
      logger.warn('AuthService', 'isOnline: health check failed')
      return false
    }
  }

  private scheduleRefresh(accessToken: string): void {
    this.cancelRefresh()
    const payload = decodeJwtPayload(accessToken)
    if (!payload) return
    const expiresAt = payload.exp * 1000
    const refreshAt = expiresAt - TOKEN_REFRESH_BUFFER_MS - Date.now()
    if (refreshAt <= 0) {
      this.refreshTokens().catch((e) => logger.error('AuthService', 'Immediate token refresh failed', e))
      return
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshTokens().catch((e) => logger.error('AuthService', 'Scheduled token refresh failed', e))
    }, refreshAt)
  }

  private cancelRefresh(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  destroy(): void {
    this.cancelRefresh()
  }
}
