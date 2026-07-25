import { getList, post } from './client'
import type {
  Notification,
} from '@shared/types'

export const notificationsApi = {
  list: (params?: { workspace_id?: string }) =>
    getList<Notification>('/notifications/', params ? { params } : undefined),
  markRead: (id: string) => post(`/notifications/${id}/read`),
  dismiss: (id: string) => post(`/notifications/${id}/dismiss`),
}
