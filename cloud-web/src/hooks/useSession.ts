"use client";

import { useAuthStore } from "@/stores/authStore";

export function useSession() {
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const refreshAccessToken = useAuthStore((s) => s.refreshAccessToken);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  return { user, tokens, isAuthenticated, isLoading, login, logout, refreshAccessToken, updateProfile };
}
