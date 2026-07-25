import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Pencil, Trash2, Check, X,
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useComments'
import { formatRelativeTime } from '@/lib/utils'
import type { Comment } from '@shared/types'
import { useStore } from '@/store'

function CommentItem({
  comment,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  comment: Comment
  currentUserId?: string
  onUpdate: (id: string, body: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.content)
  const [showActions, setShowActions] = useState(false)
  const isAuthor = comment.author_id === currentUserId

  const handleSave = () => {
    onUpdate(comment.id, editBody)
    setEditing(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-lg border bg-muted/20 p-3"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={comment.user_avatar_url} />
          <AvatarFallback className="text-[10px]">
            {(comment.user_name ?? 'A').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-medium">{comment.user_name ?? 'Anonymous'}</p>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatRelativeTime(comment.created_at)}
        </span>
      </div>

      {/* Body */}
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            autoFocus
          />
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-6 text-xs" onClick={handleSave}>
              <Check className="mr-1 h-3 w-3" /> Save
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(false)}>
              <X className="mr-1 h-3 w-3" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-foreground/90">{comment.content}</p>
      )}

      {/* Actions */}
      {showActions && !editing && isAuthor && (
        <div className="absolute right-2 top-2 flex gap-0.5 rounded border bg-background p-0.5 shadow-sm">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Edit comment"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(comment.id)}
            className="rounded p-1 text-destructive hover:bg-destructive/10"
            aria-label="Delete comment"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

export function CommentsPanel({ entityId }: { entityId: string }) {
  const [newComment, setNewComment] = useState('')
  const user = useStore((s) => s.user)
  const { data: commentsData, isLoading } = useComments({ entity_id: entityId })
  const createComment = useCreateComment()
  const updateComment = useUpdateComment()
  const deleteComment = useDeleteComment()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const comments = ((commentsData as { data?: Comment[] })?.data ?? []) as Comment[]

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (!newComment.trim()) return
    createComment.mutate({
      entity_id: entityId,
      content: newComment.trim(),
      workspace_id: '',
    })
    setNewComment('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Comments List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mb-1 text-sm font-medium">No comments yet</p>
              <p className="text-xs text-muted-foreground">
                Start a discussion about this entity.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  onUpdate={(id, content) =>
                    updateComment.mutate({ id, data: { content } })
                  }
                  onDelete={(id) => deleteComment.mutate(id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* New Comment Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[48px] max-h-[120px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <Button
            size="sm"
            className="h-[48px] shrink-0 px-3"
            onClick={handleSubmit}
            disabled={!newComment.trim() || createComment.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          ⌘+Enter to send
        </p>
      </div>
    </div>
  )
}
