import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { flaskGet } from './flask-client'
import { requireUuid } from './validate'

export function registerGovernanceHandlers(authService: AuthService): void {
  safeHandle('governance:health', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/governance/health?workspace_id=${workspaceId}`, tokens?.access_token)
  })

  safeHandle('governance:duplicates', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/governance/duplicates?workspace_id=${workspaceId}`, tokens?.access_token)
  })

  safeHandle('governance:orphans', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/governance/orphans?workspace_id=${workspaceId}`, tokens?.access_token)
  })

  safeHandle('governance:stale', async (_event, workspaceId: string, days: number) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/governance/stale?workspace_id=${workspaceId}&days=${days}`, tokens?.access_token)
  })
}
