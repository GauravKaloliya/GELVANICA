"use client";

import { useEffect, useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { commentService } from "@/lib/services/commentService";
import type { Comment } from "@/lib/types";
import MentionInput from "@/components/editor/MentionInput";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

interface CommentsPanelProps {
  token: string;
  entityId: string;
  workspaceId: string;
}

export default function CommentsPanel({ token, entityId, workspaceId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const { tokens } = useAuthStore();
  const { members, fetchMembers } = useWorkspaceStore();

  useEffect(() => {
    commentService.listByEntity(workspaceId, entityId).then((res) => setComments(res.data)).catch(() => {});
  }, [entityId, workspaceId]);

  useEffect(() => {
    if (tokens?.access_token) {
      fetchMembers(tokens.access_token, workspaceId);
    }
  }, [tokens, workspaceId, fetchMembers]);

  const mentionUsers = (members || []).map((m) => ({
    id: m.user_id,
    name: m.display_name || "",
    email: m.email || "",
    avatar_url: m.avatar_url || null,
  }));

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await commentService.create(workspaceId, {
        entity_id: entityId,
        content: newComment.trim(),
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.delete(workspaceId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;
    try {
      const res = await commentService.update(workspaceId, commentId, {
        content: editingCommentContent.trim(),
      });
      setComments((prev) => prev.map((c) => (c.id === commentId ? res.data : c)));
      toast.success("Comment updated");
    } catch {
      toast.error("Failed to update comment");
    }
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <MentionInput
          value={newComment}
          onChange={setNewComment}
          onSubmit={handleAddComment}
          placeholder="Add a comment... (type @ to mention)"
          users={mentionUsers}
          onMentionSelect={() => {}}
        />
      </div>
      <div className="space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className="group/comment rounded-md border border-border p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted">{new Date(comment.created_at).toLocaleDateString()}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => startEditComment(comment)}
                  className="text-muted hover:text-foreground hidden group-hover/comment:inline-block"
                  aria-label="Edit comment"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => handleDeleteComment(comment.id)} className="text-muted hover:text-red-400" aria-label="Delete comment">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {editingCommentId === comment.id ? (
              <input
                type="text"
                value={editingCommentContent}
                onChange={(e) => setEditingCommentContent(e.target.value)}
                onBlur={() => handleEditComment(comment.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditComment(comment.id);
                  if (e.key === "Escape") {
                    setEditingCommentId(null);
                    setEditingCommentContent("");
                  }
                }}
                autoFocus
                className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
              />
            ) : (
              <p className="text-xs text-foreground">{comment.content}</p>
            )}
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-muted text-center py-4">No comments yet.</p>
        )}
      </div>
    </div>
  );
}
