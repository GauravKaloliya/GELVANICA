import { AUTH_API_BASE } from "@/lib/config/constants";
import type { User, AuthTokens } from "../types";

interface FetchOptions extends RequestInit {
  token?: string;
}

interface AuthData {
  user: User;
  tokens: AuthTokens;
}

interface AuthResponse {
  data: AuthData;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${AUTH_API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Request failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const authApi = {
  register: async (email: string, password: string, name?: string): Promise<AuthData> => {
    const res = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    return res.data;
  },

  login: async (email: string, password: string): Promise<AuthData> => {
    const res = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return res.data;
  },

  googleLogin: async (credential: string): Promise<AuthData> => {
    const res = await request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    return res.data;
  },

  checkEmail: (email: string) =>
    request<{ data: { available: boolean } }>(
      `/auth/check-email?email=${encodeURIComponent(email)}`
    ),

  getMe: (token: string) =>
    request<{ data: User }>("/auth/me", { token }),

  updateMe: (token: string, data: { name?: string; avatar_url?: string; profile_image_url?: string }) =>
    request<{ data: User }>("/auth/me", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    request<{ data: { access_token: string } }>("/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),

  logout: (refreshToken: string) =>
    request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),

  exchangeCode: async (accessToken: string): Promise<{ code: string }> => {
    const res = await fetch(`${AUTH_API_BASE}/auth/exchange-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) throw new Error("Failed to generate exchange code");
    const json = await res.json();
    return json.data;
  },
};
