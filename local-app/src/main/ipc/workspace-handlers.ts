import { safeHandle } from './handler-wrapper'
import { AuthService } from '../auth-service'
import { flaskGet, flaskPost, flaskPatch, flaskRequest } from './flask-client'
import { requireUuid, requireString } from './validate'
import { toSearchParams } from '../../shared/utils/query-params'

export function registerWorkspaceHandlers(authService: AuthService): void {
  safeHandle('workspace:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/workspaces/${qs}`, tokens?.access_token)
  })

  safeHandle('workspace:get', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/workspaces/${workspaceId}`, tokens?.access_token)
  })

  safeHandle('workspace:create', async (_event, data: { name: string; description?: string }) => {
    const { name } = data as { name?: string; description?: string }
    requireString(name, 'name', { minLength: 1, maxLength: 200 })
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/workspaces/', data, tokens?.access_token)
  })

  safeHandle('workspace:update', async (_event, workspaceId: string, data: { name?: string; description?: string }) => {
    requireUuid(workspaceId, 'workspaceId')
    const { name, description } = data as { name?: string; description?: string }
    if (name !== undefined) requireString(name, 'name', { minLength: 1, maxLength: 200 })
    if (description !== undefined) requireString(description, 'description', { maxLength: 2000 })
    const tokens = authService.getTokens()
    return flaskPatch(`/api/v1/workspaces/${workspaceId}`, data, tokens?.access_token)
  })

  safeHandle('workspace:delete', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/workspaces/${workspaceId}`, undefined, tokens?.access_token)
  })

  safeHandle('workspace:stats', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/workspaces/${workspaceId}/stats`, tokens?.access_token)
  })
}
