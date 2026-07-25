import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { flaskGet } from './flask-client'
import { requireUuid, requireString } from './validate'

export function registerSearchHandlers(authService: AuthService): void {
  safeHandle('search:keyword', async (_event, workspaceId: string, query: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireString(query, 'query')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/search/?workspace_id=${workspaceId}&q=${encodeURIComponent(query)}&mode=keyword`, tokens?.access_token)
  })

  safeHandle('search:semantic', async (_event, workspaceId: string, query: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireString(query, 'query')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/search/?workspace_id=${workspaceId}&q=${encodeURIComponent(query)}&mode=semantic`, tokens?.access_token)
  })

  safeHandle('search:hybrid', async (_event, workspaceId: string, query: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireString(query, 'query')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/search/?workspace_id=${workspaceId}&q=${encodeURIComponent(query)}&mode=hybrid`, tokens?.access_token)
  })
}
