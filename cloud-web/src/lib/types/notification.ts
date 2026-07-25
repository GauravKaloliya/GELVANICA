export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  entity_id: string | null;
  type: "mention" | "comment" | "update" | "entity_update" | "relation_created" | "backup_complete" | "sync_conflict" | "invite" | "system";
  title: string;
  message: string | null;
  action_url: string | null;
  action_type: string | null;
  is_read: boolean;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
