import { apiClient } from "../apiClient";

interface UserListResponse { data: Array<{id:string,email:string,name:string|null,is_active:boolean,created_at:string}>; meta?: {total:number}; }
interface UserResponse { data: {id:string,email:string,name:string|null,is_active:boolean,created_at:string}; }
interface SystemStatusResponse { data: { status: string; uptime: number; version: string; }; }
interface SystemLogsResponse { data: { logs: string[] }; }
interface CleanupResponse { data: { cleaned: number }; }

export const adminService = {
  listUsers: (params?: { search?: string; page?: number; per_page?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    return apiClient.get<UserListResponse>(`/admin/users?${sp}`);
  },
  getUser: (userId: string) =>
    apiClient.get<UserResponse>(`/admin/users/${userId}`),
  updateUser: (userId: string, data: { name?: string; is_active?: boolean }) =>
    apiClient.patch<UserResponse>(`/admin/users/${userId}`, data),
  deleteUser: (userId: string) =>
    apiClient.delete(`/admin/users/${userId}`),
  getSystemStatus: () =>
    apiClient.get<SystemStatusResponse>("/admin/system/status"),
  getSystemLogs: () =>
    apiClient.get<SystemLogsResponse>("/admin/system/logs"),
  cleanup: () =>
    apiClient.post<CleanupResponse>("/admin/system/cleanup"),
};
