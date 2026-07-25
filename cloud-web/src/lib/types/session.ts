export interface SessionRecord {
  id: string;
  user_id: string;
  refresh_jti: string;
  user_agent: string | null;
  ip_address: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
}
