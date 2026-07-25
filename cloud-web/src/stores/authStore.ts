import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthTokens } from "@/lib/types";
import { authApi } from "@/lib/services/auth";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  initialize: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  updateProfile: (data: { name?: string; avatar_url?: string; profile_image_url?: string }) => Promise<void>;
}

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isLoading: true,
      isAuthenticated: false,

      login: (user, tokens) => {
        set({ user, tokens, isAuthenticated: true, isLoading: false });
        setCookie("access_token", tokens.access_token, 60 * 30);
      },

      logout: () => {
        const { tokens } = get();
        if (tokens?.refresh_token) {
          authApi.logout(tokens.refresh_token).catch(() => {});
        }
        clearCookie("access_token");
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      },

      setUser: (user) => set({ user }),

      setTokens: (tokens) => {
        set({ tokens });
        setCookie("access_token", tokens.access_token, 60 * 30);
      },

      initialize: async () => {
        const { tokens } = get();

        if (!tokens?.access_token || !tokens?.refresh_token) {
          set({ isLoading: false });
          return;
        }

        setCookie("access_token", tokens.access_token, 60 * 30);

        try {
          const res = await authApi.getMe(tokens.access_token);
          const user = res.data;
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          get().logout();
          set({ isLoading: false });
        }
      },

      refreshAccessToken: async () => {
        const { tokens } = get();
        if (!tokens?.refresh_token) return false;

        try {
          const res = await authApi.refresh(tokens.refresh_token);
          const newTokens = { access_token: res.data.access_token, refresh_token: tokens.refresh_token };
          get().setTokens(newTokens);
          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      updateProfile: async (data) => {
        const { tokens, user } = get();
        if (!tokens?.access_token || !user) return;

        const res = await authApi.updateMe(tokens.access_token, data);
        set({ user: res.data });
      },
    }),
    {
      name: "gnovium-auth",
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
