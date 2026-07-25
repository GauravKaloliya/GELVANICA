export type NotificationType = 'mention' | 'comment' | 'update' | 'entity_update' | 'invite' | 'relation_created' | 'backup_complete' | 'sync_conflict' | 'system'

export interface Notification {
  id: string
  workspace_id: string
  user_id: string
  entity_id: string | null
  type: NotificationType
  title: string
  message: string | null
  action_url: string | null
  action_type: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationCreateRequest {
  workspace_id: string
  user_id: string
  entity_id?: string | null
  type: NotificationType
  title: string
  message?: string
  action_url?: string
  action_type?: string
}

export interface ActivityEvent {
  id: string
  workspace_id: string
  user_id: string | null
  entity_id: string | null
  block_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

export type Activity = ActivityEvent
