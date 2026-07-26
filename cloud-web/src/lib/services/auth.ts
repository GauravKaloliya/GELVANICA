import { apiClient } from "../apiClient";
import type { User, AuthTokens } from "../types";

type AuthResponseData = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
};

export const authService = {
  register: (email: string, password: string, name?: string) =>
    apiClient.post<{data: AuthResponseData}>("/auth/register", { email, password, name }),

  login: (email: string, password: string) =>
    apiClient.post<{data: AuthResponseData}>("/auth/login", { email, password }),

  googleLogin: (credential: string) =>
    apiClient.post<{data: AuthResponseData}>("/auth/google", { credential }),

  checkEmail: (email: string) =>
    apiClient.get<{data: {available: boolean}}>(`/auth/check-email?email=${encodeURIComponent(email)}`),

  getMe: () =>
    apiClient.get<{data: User}>("/auth/me"),

  updateMe: (data: { name?: string; avatar_url?: string; profile_image_url?: string }) =>
    apiClient.patch<{data: User}>("/auth/me", data),

  refresh: (refreshToken: string) =>
    apiClient.post<{data: {access_token: string; refresh_token: string; token_type: string; expires_in: number}}>("/auth/refresh", {}, refreshToken),

  logout: (refreshToken: string) =>
    apiClient.post("/auth/logout", {}, refreshToken),

  exchangeCode: (accessToken: string) =>
    apiClient.post<{data: {code: string}}>("/auth/exchange-code", {}, accessToken),

  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.post<{data: {success: boolean}}>("/auth/change-password", data),

  forgotPassword: (email: string) =>
    apiClient.post<{data: {message: string}}>("/auth/forgot-password", { email }),

  resetPassword: (data: { token: string; password: string }) =>
    apiClient.post<{data: {message: string}}>("/auth/reset-password", data),

  authorize: (params: { client_id: string; redirect_uri: string; response_type: string }) =>
    apiClient.get<{data: {code: string; state?: string}}>(`/auth/authorize?${new URLSearchParams(params as Record<string, string>)}`),

  authorizePost: (data: { client_id: string; redirect_uri: string; response_type: string; state?: string }) =>
    apiClient.post<{data: {code: string; state?: string}}>("/auth/authorize", data),

  exchange: (data: { code: string; client_id: string; client_secret: string }) =>
    apiClient.post<{data: {access_token: string; refresh_token: string; token_type: string; expires_in: number}}>("/auth/exchange", data),

  avatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData<{data: {avatar_url: string}}>("/auth/avatar", formData);
  },

  profileChanged: () =>
    apiClient.post<{data: {changed: boolean}}>("/auth/profile-changed"),
};
