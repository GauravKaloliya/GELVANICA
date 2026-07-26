import { apiClient } from "../apiClient";
import type { Comment } from "../types";

interface CommentResponse {
  data: Comment;
}

interface CommentListResponse {
  data: Comment[];
  meta?: { total: number };
}

export const commentService = {
  listByEntity: (workspaceId: string, entityId: string) =>
    apiClient.get<CommentListResponse>(`/workspaces/${workspaceId}/comments/?entity_id=${entityId}`),

  listByBlock: (workspaceId: string, blockId: string) =>
    apiClient.get<CommentListResponse>(`/workspaces/${workspaceId}/comments/?block_id=${blockId}`),

  get: (workspaceId: string, commentId: string) =>
    apiClient.get<CommentResponse>(`/workspaces/${workspaceId}/comments/${commentId}`),

  create: (workspaceId: string, data: {
    entity_id?: string;
    block_id?: string;
    parent_comment_id?: string;
    content: string;
  }) => apiClient.post<CommentResponse>(`/workspaces/${workspaceId}/comments/`, data),

  update: (workspaceId: string, commentId: string, data: { content: string }) =>
    apiClient.patch<CommentResponse>(`/workspaces/${workspaceId}/comments/${commentId}`, data),

  delete: (workspaceId: string, commentId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/comments/${commentId}`),

  restore: (workspaceId: string, commentId: string) =>
    apiClient.post<CommentResponse>(`/workspaces/${workspaceId}/comments/${commentId}/restore`),
};
