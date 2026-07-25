import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { flaskGet, flaskPost, flaskPatch } from './flask-client'
import { requireUuid } from './validate'

export function registerVersionHandlers(authService: AuthService): void {
  safeHandle('versioning:history', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/versions/entities/${entityId}`, tokens?.access_token)
  })

  safeHandle('versioning:snapshot', async (_event, branchId: string, name: string, description: string) => {
    requireUuid(branchId, 'branchId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/versions/snapshots', { branch_id: branchId, name, description }, tokens?.access_token)
  })

  safeHandle('versioning:branches', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/branches/?workspace_id=${workspaceId}`, tokens?.access_token)
  })

  safeHandle('versioning:create-branch', async (_event, workspaceId: string, name: string, description: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/branches/', { workspace_id: workspaceId, name, description }, tokens?.access_token)
  })

  safeHandle('versioning:diff', async (_event, leftVersionId: string, rightVersionId: string) => {
    requireUuid(leftVersionId, 'leftVersionId')
    requireUuid(rightVersionId, 'rightVersionId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/versions/compare?left_version_id=${leftVersionId}&right_version_id=${rightVersionId}`, tokens?.access_token)
  })

  safeHandle('versioning:merge', async (_event, sourceBranchId: string, targetBranchId: string) => {
    requireUuid(sourceBranchId, 'sourceBranchId')
    requireUuid(targetBranchId, 'targetBranchId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/branches/merge', {
      source_branch_id: sourceBranchId,
      target_branch_id: targetBranchId,
    }, tokens?.access_token)
  })

  safeHandle('versioning:resolve-conflict', async (_event, id: string, resolution: string) => {
    requireUuid(id, 'id')
    const tokens = authService.getTokens()
    return flaskPatch(`/api/v1/branches/merge-conflicts/${id}/resolve`, { resolution }, tokens?.access_token)
  })
}
