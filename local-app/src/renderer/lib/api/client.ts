import axios, { AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from '@/components/common/Toast'
import { rendererLogger } from '@lib/logger'
import type {
  ApiResponse,
  PaginationMeta,
} from '@shared/types'

export const API_BASE = `http://${import.meta.env.VITE_FLASK_HOST || '127.0.0.1'}:${import.meta.env.VITE_FLASK_PORT || '5001'}`
const BASE_URL = `${API_BASE}/api/v1`
const HEALTH_URL = `${API_BASE}/health`

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const { tokens } = await window.gnovium.auth.getTokens()
      if (tokens?.access_token) {
        config.headers.Authorization = `Bearer ${tokens.access_token}`
      }
    } catch {
      // Token fetch failed; proceed without auth header
    }
    const method = (config.method ?? 'GET').toUpperCase()
    rendererLogger.debug('API', `${method} ${config.url ?? ''}`)
    ;(config as InternalAxiosRequestConfig & { _startTime?: number })._startTime = Date.now()
    return config
  },
  (error: unknown) => Promise.reject(error)
)

client.interceptors.response.use(
  (response) => {
    const config = response.config as InternalAxiosRequestConfig & { _startTime?: number }
    const method = (config.method ?? 'GET').toUpperCase()
    const elapsed = config._startTime ? Date.now() - config._startTime : undefined
    const suffix = elapsed !== undefined ? ` (${elapsed}ms)` : ''
    rendererLogger.debug('API', `${method} ${config.url ?? ''} → ${response.status}${suffix}`)
    return response
  },
  (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _startTime?: number }) | undefined
    const method = (config?.method ?? 'GET').toUpperCase()
    const url = config?.url ?? ''
    const status = error.response?.status ?? 'N/A'
    const elapsed = config?._startTime ? Date.now() - config._startTime : undefined
    const suffix = elapsed !== undefined ? ` (${elapsed}ms)` : ''
    rendererLogger.error('API', `${method} ${url} → ${status}${suffix}`, { message: error.message })
    return Promise.reject(error)
  }
)

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      window.gnovium.auth.getTokens()
        .then(({ tokens }) => {
          if (tokens?.access_token) {
            return window.gnovium.auth.logout()
          }
          return undefined
        })
        .catch(() => {})
    }
    return Promise.reject(error)
  }
)

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number }
    if (!config) return Promise.reject(error)
    
    const status = error.response?.status
    const isNetworkError = !error.response
    const isRetryable = isNetworkError || (status !== undefined && status >= 500)
    
    if (!isRetryable) return Promise.reject(error)
    
    config._retryCount = config._retryCount ?? 0
    if (config._retryCount >= 3) return Promise.reject(error)
    
    config._retryCount += 1
    const delay = Math.pow(2, config._retryCount - 1) * 1000
    await new Promise((resolve) => setTimeout(resolve, delay))
    return client(config)
  }
)

const silentlyIgnoredStatuses = new Set([401])

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    const status = error.response?.status
    if (status && !silentlyIgnoredStatuses.has(status)) {
      const serverMessage = error.response?.data?.error?.message
      const message = serverMessage ?? `Request failed (${status})`
      toast.error(message)
    }
    return Promise.reject(error)
  }
)

function unwrap<T>(res: { data: ApiResponse<T> | T }): T {
  const body = res.data as ApiResponse<T>
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T
  }
  return body as T
}

function unwrapList<T>(res: { data: ApiResponse<T[]> | T[] }): T[] {
  return unwrap<T[]>(res)
}

function unwrapPaginated<T>(res: { data: ApiResponse<T[]> }): { data: T[]; meta?: PaginationMeta } {
  const body = res.data as ApiResponse<T[]>
  if (body && typeof body === 'object' && 'data' in body) {
    return { data: body.data as T[], meta: body.meta }
  }
  return { data: body as T[], meta: undefined }
}

type RequestConfig = Record<string, unknown>

async function get<T>(url: string, config?: RequestConfig): Promise<T> {
  return client.get<ApiResponse<T> | T>(url, config).then(unwrap<T>)
}

async function getList<T>(url: string, config?: RequestConfig): Promise<T[]> {
  return client.get<ApiResponse<T[]>>(url, config).then(unwrapList<T>)
}

async function getPaginated<T>(url: string, config?: RequestConfig): Promise<{ data: T[]; meta?: PaginationMeta }> {
  return client.get<ApiResponse<T[]>>(url, config).then(unwrapPaginated<T>)
}

async function post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return client.post<ApiResponse<T> | T>(url, data, config).then(unwrap<T>)
}

async function patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return client.patch<ApiResponse<T> | T>(url, data, config).then(unwrap<T>)
}

async function put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return client.put<ApiResponse<T> | T>(url, data, config).then(unwrap<T>)
}

async function del<T = void>(url: string): Promise<T> {
  return client.delete<ApiResponse<T> | T>(url).then(unwrap<T>)
}

function upload<T>(url: string, formData: FormData): Promise<T> {
  return client.post<ApiResponse<T> | T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(unwrap<T>)
}

function healthCheck(): Promise<Record<string, string>> {
  return fetch(HEALTH_URL).then((r) => r.json() as Promise<Record<string, string>>)
}

export { client, unwrap, get, getList, getPaginated, post, patch, put, del, upload, healthCheck }
export type { RequestConfig }
