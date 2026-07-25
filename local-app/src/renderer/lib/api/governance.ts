import { get, post } from './client'
import type {
  GovernanceReport,
} from '@shared/types'

export const governanceApi = {
  health: (workspaceId: string) =>
    get<GovernanceReport>('/governance/health', { params: { workspace_id: workspaceId } }),
  duplicates: (workspaceId: string) =>
    get('/governance/duplicates', { params: { workspace_id: workspaceId } }),
  orphans: (workspaceId: string) =>
    get('/governance/orphans', { params: { workspace_id: workspaceId } }),
  stale: (workspaceId: string) =>
    get('/governance/stale', { params: { workspace_id: workspaceId } }),
  recalculateHealth: (workspaceId: string) =>
    post('/governance/health-score', null, { params: { workspace_id: workspaceId } }),
}
