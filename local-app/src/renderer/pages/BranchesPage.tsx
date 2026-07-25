import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, Plus, Trash2, Merge, Check, AlertTriangle, GitCompare, ArrowRight, AlertCircle } from 'lucide-react'
import { useBranches, useDeleteBranch, useCreateBranch } from '@/hooks/useBranches'
import { useMergeConflicts, useResolveMergeConflict, useMergeBranch } from '@/hooks/useMergeConflicts'
import { useStore } from '@/store'
import { MutationToast } from '@/hooks/useMutationToast'
import { BranchMergeModal } from '@/components/modals/BranchMergeModal'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function BranchesPage() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: branches = [], isLoading, isError } = useBranches(activeWorkspaceId ?? undefined)
  const createBranch = useCreateBranch()
  const deleteBranch = useDeleteBranch()
  const mergeBranch = useMergeBranch()
  const { data: mergeConflicts } = useMergeConflicts({ workspace_id: activeWorkspaceId ?? '' })
  const resolveConflict = useResolveMergeConflict()

  const conflicts = ((mergeConflicts as { data?: Array<{ id: string; source_branch_id: string; target_branch_id: string; status: string }> })?.data ?? []) ?? []

  const hasConflicts = (branchId: string) => conflicts.some((c) => (c.source_branch_id === branchId || c.target_branch_id === branchId) && c.status === 'pending')

  const [createOpen, setCreateOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [activeConflictId, setActiveConflictId] = useState<string | null>(null)
  const [compareBranchId, setCompareBranchId] = useState<string | null>(null)

  function handleCreate() {
    if (!activeWorkspaceId || !newName.trim()) return
    createBranch.mutate(
      { workspace_id: activeWorkspaceId, name: newName.trim(), description: newDescription.trim() || undefined },
      { onSuccess: () => { setCreateOpen(false); setNewName(''); setNewDescription('') } }
    )
  }

  function handleDelete(id: string) {
    deleteBranch.mutate(id, { onSuccess: () => setDeleteConfirmId(null) })
  }

  function handleResolveConflict(resolution: 'ours' | 'theirs' | 'manual') {
    if (!activeConflictId) return
    resolveConflict.mutate(
      { conflictId: activeConflictId, data: { resolution } },
      { onSuccess: () => { setConflictDialogOpen(false); setActiveConflictId(null) } }
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
          <h3 className="text-sm font-semibold text-foreground">Failed to load branches</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong while loading branches. Please try again.
          </p>
        </div>
      </div>
    )
  }

  const compareBranch = compareBranchId ? branches.find((b) => b.id === compareBranchId) : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
      <MutationToast mutation={deleteBranch} messages={{ success: 'Branch deleted', error: 'Failed to delete branch' }} />
      <MutationToast mutation={createBranch} messages={{ success: 'Branch created', error: 'Failed to create branch' }} />
      <MutationToast mutation={mergeBranch} messages={{ success: 'Branches merged', error: 'Failed to merge branches' }} />
      <MutationToast mutation={resolveConflict} messages={{ success: 'Conflict resolved', error: 'Failed to resolve conflict' }} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Manage knowledge branches for parallel exploration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)} disabled={branches.length < 2}>
            <Merge className="mr-1.5 h-4 w-4" /> Merge
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Branch
          </Button>
        </div>
      </div>

      {branches.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="h-6 w-6 text-muted-foreground" />}
          title="No branches yet"
          description="Create a branch to explore alternate knowledge paths without affecting the main timeline."
          action={<Button onClick={() => setCreateOpen(true)}>Create Branch</Button>}
        />
      ) : (
        <div className="space-y-6">
          {/* Compare view */}
          {branches.length >= 2 && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-4 py-4">
                <GitCompare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Compare branches</span>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={compareBranchId ?? ''}
                    onChange={(e) => setCompareBranchId(e.target.value || null)}
                  >
                    <option value="">Select branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {compareBranch && (
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        {compareBranch.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {compareBranch.is_default ? 'Main branch' : `Created ${new Date(compareBranch.created_at).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {branches.map((branch) => (
                <motion.div
                  key={branch.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">{branch.name}</CardTitle>
                        </div>
                        {branch.is_default && (
                          <Badge variant="default" className="text-xs">
                            <Check className="mr-1 h-3 w-3" /> Default
                          </Badge>
                        )}
                        {hasConflicts(branch.id) && (() => {
                          const pendingConflict = conflicts.find((c) => (c.source_branch_id === branch.id || c.target_branch_id === branch.id) && c.status === 'pending')
                          return pendingConflict ? (
                            <button
                              onClick={() => {
                                setActiveConflictId(pendingConflict.id)
                                setConflictDialogOpen(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/20 transition-colors"
                            >
                              <AlertTriangle className="h-3 w-3" /> Resolve
                            </button>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Conflicts
                            </Badge>
                          )
                        })()}
                      </div>
                      {branch.description && (
                        <CardDescription className="mt-1">{branch.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(branch.created_at).toLocaleDateString()}
                        </span>
                        {!branch.is_default && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setCompareBranchId(branch.id)}
                              title="Compare"
                            >
                              <GitCompare className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(branch.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Create Branch Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Branch</DialogTitle>
            <DialogDescription>Create a new branch to explore a parallel knowledge path.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="e.g. experiment-q4" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea placeholder="Optional description..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createBranch.isPending}>
              {createBranch.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Modal */}
      <BranchMergeModal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onMerge={(sourceBranchId, targetBranchId) => {
          mergeBranch.mutate(
            { sourceBranchId, targetBranchId },
            { onSuccess: () => setMergeOpen(false) }
          )
        }}
        isPending={mergeBranch.isPending}
      />

      {/* Conflict Resolution Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Merge Conflict</DialogTitle>
            <DialogDescription>
              Choose how to resolve this conflict. You can keep your changes, accept theirs, or merge manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => handleResolveConflict('ours')}
              disabled={resolveConflict.isPending}
            >
              <Check className="mr-2 h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">Keep ours</div>
                <div className="text-xs text-muted-foreground">Discard their changes and keep this branch's content</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => handleResolveConflict('theirs')}
              disabled={resolveConflict.isPending}
            >
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">Accept theirs</div>
                <div className="text-xs text-muted-foreground">Accept the incoming changes from the source branch</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => handleResolveConflict('manual')}
              disabled={resolveConflict.isPending}
            >
              <Check className="mr-2 h-4 w-4 text-yellow-500" />
              <div>
                <div className="font-medium">Manual resolution</div>
                <div className="text-xs text-muted-foreground">Merge both changes manually in the editor</div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
        title="Delete Branch"
        description="Are you sure you want to delete this branch? This action cannot be undone."
        confirmLabel={deleteBranch.isPending ? 'Deleting...' : 'Delete'}
        variant="destructive"
        onConfirm={() => { if (deleteConfirmId) void handleDelete(deleteConfirmId) }}
      />
    </motion.div>
  )
}
