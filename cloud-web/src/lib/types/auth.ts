export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  profile_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

