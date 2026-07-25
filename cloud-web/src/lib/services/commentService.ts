import { API_BASE } from "@/lib/config/constants";
import type { Comment } from "@/lib/types";

interface CommentResponse {
  data: Comment;
}

interface CommentListResponse {
  data: Comment[];
  meta?: { total: number };
}

async function commentApi<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Comment request failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const commentService = {
  listByEntity: async (token: string, entityId: string): Promise<Comment[]> => {
    const res = await commentApi<CommentListResponse>(`/comments/?entity_id=${entityId}`, token);
    return res.data || [];
  },

  listByBlock: async (token: string, blockId: string): Promise<Comment[]> => {
    const res = await commentApi<CommentListResponse>(`/comments/?block_id=${blockId}`, token);
    return res.data || [];
  },

  create: async (token: string, data: {
    workspace_id: string;
    entity_id?: string;
    block_id?: string;
    parent_comment_id?: string;
    content: string;
  }): Promise<Comment> => {
    const res = await commentApi<CommentResponse>("/comments/", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  update: async (token: string, commentId: string, data: { content: string }): Promise<Comment> => {
    const res = await commentApi<CommentResponse>(`/comments/${commentId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  delete: async (token: string, commentId: string): Promise<void> => {
    await commentApi(`/comments/${commentId}`, token, { method: "DELETE" });
  },
};
