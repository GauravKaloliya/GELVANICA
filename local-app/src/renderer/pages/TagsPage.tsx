import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tags, Plus, Search, Pencil, Trash2, X, Check, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateTagModal } from '@/components/tags/CreateTagModal'
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useTags, useUpdateTag, useDeleteTag } from '@/hooks/useTags'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Tag as TagType } from '@shared/types'

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6b7280',
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}

const item = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 },
}

export default function TagsPage() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: tagsData, isLoading } = useTags(activeWorkspaceId ?? undefined)
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(TAG_COLORS[0])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null)
  const [entityListOpen, setEntityListOpen] = useState(false)

  const tags = useMemo(() => {
    const raw = (tagsData as { data?: TagType[] })?.data ?? []
    return raw as TagType[]
  }, [tagsData])

  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags
    const q = search.toLowerCase()
    return tags.filter((t) => t.name.toLowerCase().includes(q))
  }, [tags, search])

  function startEdit(tag: TagType) {
    setEditingId(tag.id)
    setEditName(tag.name ?? '')
    setEditColor(tag.color ?? TAG_COLORS[0])
  }

  function saveEdit(tagId: string) {
    if (!editName.trim()) return
    updateTag.mutate(
      { id: tagId, data: { name: editName.trim(), color: editColor } },
      { onSuccess: () => setEditingId(null) },
    )
  }

  function handleDelete(tagId: string) {
    deleteTag.mutate(tagId, { onSuccess: () => setDeleteConfirmId(null) })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col p-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Tags className="h-6 w-6" />
            Tags
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize and categorize your entities
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create Tag
        </Button>
      </div>

      {/* Search bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{tags.length} tags total</span>
        {search && <span>{filteredTags.length} matching</span>}
      </div>

      {/* Tags grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Hash className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {search ? 'No matching tags' : 'No tags yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search ? 'Try a different search term' : 'Create your first tag to organize entities.'}
            </p>
            {!search && (
              <Button size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Tag
              </Button>
            )}
          </div>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid flex-1 gap-3 overflow-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence>
            {filteredTags.map((tag) => (
              <motion.div key={tag.id} variants={item} layout>
                {editingId === tag.id ? (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {/* Color picker */}
                        <div className="flex gap-1.5">
                          {TAG_COLORS.slice(0, 7).map((c) => (
                            <button
                              key={c}
                              onClick={() => setEditColor(c)}
                              className={cn(
                                'h-4 w-4 rounded-full transition-transform',
                                editColor === c ? 'scale-125 ring-2 ring-primary ring-offset-1' : 'hover:scale-110',
                              )}
                              style={{ backgroundColor: c }}
                              aria-label={`Select color ${c}`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 flex-1 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(tag.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(tag.id)} aria-label="Save tag">
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)} aria-label="Cancel edit">
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card
                    className="group cursor-pointer transition-colors hover:border-primary/50"
                    onClick={() => { setSelectedTag(tag); setEntityListOpen(true) }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: tag.color ?? TAG_COLORS[0] }}
                          />
                          <CardTitle className="text-sm">{tag.name}</CardTitle>
                        </div>
                        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(tag) }}
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(tag.id) }}
                            className="rounded p-0.5 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">
                          {tag.entity_count ?? 0} entities
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(tag.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateTagModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete Tag"
        description="This will permanently remove the tag. Entities will retain their other tags."
        action={{ type: 'delete' }}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        isPending={deleteTag.isPending}
      />

      {/* Tag Entity List Dialog */}
      <Dialog open={entityListOpen} onOpenChange={setEntityListOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: selectedTag?.color ?? TAG_COLORS[0] }}
              />
              {selectedTag?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTag?.entity_count ?? 0} entities tagged with this tag
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto py-2">
            {(selectedTag?.entity_count ?? 0) === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No entities have this tag yet.
              </p>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Tagged entities are visible in entity details and search results.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEntityListOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
