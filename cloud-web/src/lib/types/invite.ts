export interface Invite {
  id: string;
  workspace_id: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  invited_by: string;
  token: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
