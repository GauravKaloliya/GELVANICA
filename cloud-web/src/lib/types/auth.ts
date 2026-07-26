export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  profile_image_url?: string | null;
  password_hash: string | null;
  google_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthCode {
  id: string;
  code: string;
  user_id: string;
  expires_at: string;
  consumed_at: string | null;
  redirect_uri: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

