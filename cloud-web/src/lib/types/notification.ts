export type NotificationType =
  | 'mention' | 'comment' | 'update' | 'entity_update'
  | 'invite' | 'relation_created' | 'backup_complete'
  | 'sync_conflict' | 'system' | 'share'
  | 'version_created' | 'export_complete' | 'import_complete'
  | 'governance_report_ready' | 'system_alert';

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  entity_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
