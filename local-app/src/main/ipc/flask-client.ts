import { readFile, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { app } from 'electron'
import { logger } from '../logger'
import { env } from '@main/env'
import { FlaskError, PathError } from '../../shared/errors'
import type { AppSettings } from '../../shared/types'

export type { AppSettings }

export const FLASK_BASE_URL = env.FLASK_BASE_URL
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 500
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024 // 10MB

export interface FlaskResponse<T = unknown> {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function validateBodySize(body: unknown): void {
  if (body === undefined) return
  const serialized = JSON.stringify(body)
  if (serialized.length > MAX_REQUEST_BODY_BYTES) {
    throw new FlaskError(413, `Request body exceeds ${MAX_REQUEST_BODY_BYTES} bytes`)
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function flaskRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<FlaskResponse<T>> {
  validateBodySize(body)

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now()
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${FLASK_BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      })

      const elapsed = Date.now() - start
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
          logger.warn('FlaskClient', `${method} ${path} → ${response.status} (${elapsed}ms) — retrying in ${getRetryDelay(attempt)}ms`)
          await sleep(getRetryDelay(attempt))
          continue
        }
        logger.warn('FlaskClient', `${method} ${path} → ${response.status} (${elapsed}ms)`)
        return {
          ok: false,
          status: response.status,
          data: null,
          error: (data as { message?: string })?.message ?? response.statusText,
        }
      }

      logger.debug('FlaskClient', `${method} ${path} → ${response.status} (${elapsed}ms)`)
      return { ok: true, status: response.status, data: data as T }
    } catch (error) {
      const elapsed = Date.now() - start
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < MAX_RETRIES) {
        logger.warn('FlaskClient', `${method} ${path} → ERROR (${elapsed}ms) — retrying in ${getRetryDelay(attempt)}ms`)
        await sleep(getRetryDelay(attempt))
        continue
      }

      logger.error('FlaskClient', `${method} ${path} → ERROR (${elapsed}ms): ${lastError.message}`)
    }
  }

  return {
    ok: false,
    status: 0,
    data: null,
    error: lastError?.message ?? 'Network error after retries',
  }
}

export async function flaskGet<T>(path: string, token?: string): Promise<FlaskResponse<T>> {
  return flaskRequest<T>('GET', path, undefined, token)
}

export async function flaskPost<T>(path: string, body?: unknown, token?: string): Promise<FlaskResponse<T>> {
  return flaskRequest<T>('POST', path, body, token)
}

export async function flaskPatch<T>(path: string, body?: unknown, token?: string): Promise<FlaskResponse<T>> {
  return flaskRequest<T>('PATCH', path, body, token)
}

export function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function readSettings(): Promise<Partial<AppSettings>> {
  try {
    const raw = await readFile(getSettingsPath(), 'utf-8')
    return JSON.parse(raw) as Partial<AppSettings>
  } catch {
    return {}
  }
}

export async function writeSettings(settings: Partial<AppSettings>): Promise<void> {
  await writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export function safePath(requestedPath: string): string {
  const resolved = resolve(requestedPath)
  const allowed = [
    app.getPath('userData'),
    app.getPath('documents'),
    app.getPath('downloads'),
    app.getPath('temp'),
  ]

  const isAllowed = allowed.some((dir) => {
    const normalizedDir = resolve(dir) + '/'
    return resolved.startsWith(normalizedDir) || resolved === resolve(dir)
  })

  if (!isAllowed) {
    throw new PathError(requestedPath)
  }
  return resolved
}
