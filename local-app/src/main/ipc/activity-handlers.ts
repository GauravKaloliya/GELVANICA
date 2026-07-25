import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { flaskGet } from './flask-client'
import { toSearchParams } from '../../shared/utils/query-params'

export function registerActivityHandlers(authService: AuthService): void {
  safeHandle('activity:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/activity/${qs}`, tokens?.access_token)
  })
}
