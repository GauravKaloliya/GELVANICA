import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FolderOpen, Plus, Loader2, Zap, MoreVertical, Pencil, Trash2, Check, X, LogIn } from 'lucide-react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWorkspaces, useCreateWorkspace, useUpdateWorkspace, useDeleteWorkspace } from '@/hooks/useWorkspace'
import { useStore } from '@/store'
import { ROUTES } from '@/router'
import { formatRelativeTime } from '@/lib/utils'
import type { Workspace } from '@shared/types'

export default function WorkspacePicker() {
  const navigate = useNavigate()
  const { setActiveWorkspace } = useStore()
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const authLoading = useStore((s) => s.isLoading)
  const { data, isLoading } = useWorkspaces({ per_page: 50 })
  const createWorkspace = useCreateWorkspace()
  const updateWorkspace = useUpdateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)

  const workspaces = (data as { data?: Workspace[] })?.data ?? []

  const login = useCallback(() => {
    void window.gnovium.auth.openWebview()
  }, [])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleCreate = () => {
    if (!isAuthenticated || !name.trim()) return
    createWorkspace.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (result) => {
          const ws = result as { id: string }
          setActiveWorkspace(ws.id)
          setDialogOpen(false)
          setName('')
          setDescription('')
          navigate(ROUTES.DASHBOARD)
        },
      }
    )
  }

  const handleSelect = (id: string) => {
    if (editingId) return
    setActiveWorkspace(id)
    navigate(ROUTES.DASHBOARD)
  }

  const startEditing = (ws: Workspace) => {
    setEditingId(ws.id)
    setEditName(ws.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEditing = () => {
    if (!editingId || !editName.trim()) {
      cancelEditing()
      return
    }
    updateWorkspace.mutate(
      { id: editingId, data: { name: editName.trim() } },
      { onSuccess: () => { setEditingId(null); setEditName('') } }
    )
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteWorkspace.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to GNOVIUM</h1>
          <p className="mt-2 text-muted-foreground">
            Select a workspace or create a new one to get started.
          </p>
          {!isAuthenticated && (
            <Button className="mt-5" onClick={login} disabled={authLoading}>
              {authLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Sign in with Gnovium
            </Button>
          )}
        </div>

        {/* Create New */}
        <Card
          className="mb-4 cursor-pointer border-dashed transition-colors hover:bg-accent/50"
          onClick={() => {
            if (isAuthenticated) {
              setDialogOpen(true)
            } else {
              login()
            }
          }}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Create New Workspace</CardTitle>
            <CardDescription>
              {isAuthenticated ? 'Start fresh with a blank workspace' : 'Sign in to create and sync workspaces'}
            </CardDescription>
            </div>
          </CardContent>
        </Card>

        {/* Workspace List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : workspaces.length > 0 ? (
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <Card
                key={ws.id}
                className="group cursor-pointer transition-colors hover:bg-accent/50 hover:shadow-sm"
                onClick={() => handleSelect(ws.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingId === ws.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          ref={editInputRef}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing()
                            if (e.key === 'Escape') cancelEditing()
                          }}
                          onBlur={saveEditing}
                          className="h-7 text-sm"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={saveEditing} disabled={updateWorkspace.isPending}>
                          {updateWorkspace.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEditing}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <p className="truncate text-sm font-medium">{ws.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {ws.description || 'No description'} · {formatRelativeTime(ws.updated_at)}
                    </p>
                  </div>
                  {editingId !== ws.id && (
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEditing(ws)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(ws)}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6 text-muted-foreground" />}
            title="No workspaces yet"
            description="Create your first workspace to start building your knowledge base."
          />
        )}
      </motion.div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name</label>
              <Input
                placeholder="My Workspace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="What is this workspace for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!isAuthenticated || !name.trim() || createWorkspace.isPending}>
              {createWorkspace.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteWorkspace.isPending}>
              {deleteWorkspace.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
