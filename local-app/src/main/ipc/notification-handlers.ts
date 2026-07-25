import { Notification } from 'electron'
import { safeHandle, safeOn } from './handler-wrapper'
import { flaskGet, flaskPost } from './flask-client'
import type { AuthService } from '../auth-service'
import { requireUuid } from './validate'

export function registerNotificationHandlers(authService: AuthService): void {
  safeOn('notifications:show', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })

  safeHandle('notifications:list', async () => {
    const tokens = authService.getTokens()
    const response = await flaskGet('/api/v1/notifications/', tokens?.access_token)
    return response
  })

  safeHandle('notifications:mark-read', async (_event, notificationId: string) => {
    requireUuid(notificationId, 'notificationId')
    const tokens = authService.getTokens()
    const response = await flaskPost(`/api/v1/notifications/${notificationId}/read`, undefined, tokens?.access_token)
    return response
  })

  safeHandle('notifications:dismiss', async (_event, notificationId: string) => {
    requireUuid(notificationId, 'notificationId')
    const tokens = authService.getTokens()
    const response = await flaskPost(`/api/v1/notifications/${notificationId}/dismiss`, undefined, tokens?.access_token)
    return response
  })
}
