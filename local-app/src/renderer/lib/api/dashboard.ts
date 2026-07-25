import { get } from './client'
import type {
  DashboardOverview,
} from '@shared/types'

export const dashboardApi = {
  overview: (workspaceId: string) =>
    get<DashboardOverview>('/dashboard/overview', { params: { workspace_id: workspaceId } }),
}
