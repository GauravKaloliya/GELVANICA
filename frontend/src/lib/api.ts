export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + (process.env.NEXT_PUBLIC_API_BASE_PATH || "/api/v1");

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; tokens: AuthTokens }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Registration failed");
  }
  const json = await res.json();
  return json.data;
}

export async function checkEmail(email: string): Promise<{ available: boolean }> {
  const res = await fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to check email");
  }
  const json = await res.json();
  return json.data;
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; tokens: AuthTokens }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Login failed");
  }
  const json = await res.json();
  return json.data;
}

export async function googleLogin(
  credential: string
): Promise<{ user: User; tokens: AuthTokens }> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Google sign-in failed");
  }
  const json = await res.json();
  return json.data;
}