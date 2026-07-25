import { getPaginated } from './client'
import type {
  Activity,
  PaginationParams,
} from '@shared/types'

export interface ActivityParams extends PaginationParams {
  since?: string
  until?: string
  action?: string
}

export const activityApi = {
  list: (params: { workspace_id: string } & ActivityParams) =>
    getPaginated<Activity>('/activity/', { params }),
  events: (entityId: string, params?: PaginationParams) =>
    getPaginated<Activity>('/activity/events', { params: { entity_id: entityId, ...params } }),
}
