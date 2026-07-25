import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Plus, Trash2, Eye, Clock, RotateCcw, GitBranch } from 'lucide-react'
import { useSnapshots, useCreateSnapshot, useDeleteSnapshot, useRestoreVersion } from '@/hooks/useVersions'
import { useBranches } from '@/hooks/useBranches'
import { useStore } from '@/store'
import { MutationToast } from '@/hooks/useMutationToast'
import { EmptyState } from '@/components/common/EmptyState'
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SnapshotsPage() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: snapshots = [], isLoading } = useSnapshots(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : undefined)
  const { data: branches = [] } = useBranches(activeWorkspaceId ?? undefined)
  const createSnapshot = useCreateSnapshot()
  const deleteSnapshot = useDeleteSnapshot()
  const restoreVersion = useRestoreVersion()

  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null)
  const [selectedSnapshot, setSelectedSnapshot] = useState<typeof snapshots[number] | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')

  function handleCreate() {
    if (!selectedBranchId) return
    createSnapshot.mutate(
      { branch_id: selectedBranchId, name: newName.trim() || undefined, description: newDescription.trim() || undefined },
      {
        onSuccess: () => {
          setCreateOpen(false)
          setNewName('')
          setNewDescription('')
          setSelectedBranchId('')
        },
      }
    )
  }

  function handleDelete(id: string) {
    deleteSnapshot.mutate(id, { onSuccess: () => setDeleteConfirmId(null) })
  }

  function handleRestore(id: string) {
    restoreVersion.mutate(id, {
      onSuccess: () => {
        setRestoreConfirmId(null)
      },
    })
  }

  function getBranchName(branchId: string) {
    const branch = branches.find((b) => b.id === branchId)
    return branch?.name ?? branchId
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
      <MutationToast mutation={deleteSnapshot} messages={{ success: 'Snapshot deleted', error: 'Failed to delete snapshot' }} />
      <MutationToast mutation={restoreVersion} messages={{ success: 'Restored successfully', error: 'Failed to restore' }} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Snapshots</h1>
          <p className="text-sm text-muted-foreground">
            Point-in-time captures of your workspace state
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={branches.length === 0}>
          <Plus className="mr-1.5 h-4 w-4" /> New Snapshot
        </Button>
      </div>

      {snapshots.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-6 w-6 text-muted-foreground" />}
          title="No snapshots yet"
          description="Create snapshots to save and restore the state of your knowledge base."
          action={<Button onClick={() => setCreateOpen(true)}>Create Snapshot</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {snapshots.map((snapshot) => (
              <motion.div
                key={snapshot.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group cursor-pointer transition-colors hover:border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">{snapshot.name || 'Unnamed Snapshot'}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(snapshot.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    {snapshot.description && (
                      <CardDescription className="mt-1">{snapshot.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GitBranch className="h-3 w-3" />
                        <span>{getBranchName(snapshot.branch_id)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(snapshot.created_at).toLocaleTimeString()}
                        </span>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); setSelectedSnapshot(snapshot); setDetailOpen(true) }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-500 hover:text-emerald-600"
                            title="Restore this snapshot"
                            onClick={(e) => { e.stopPropagation(); setRestoreConfirmId(snapshot.id) }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(snapshot.id) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Snapshot Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>Save the current state of a branch as a named snapshot.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}{b.is_default ? ' (default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="e.g. pre-release-v2" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea placeholder="Optional description..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!selectedBranchId || createSnapshot.isPending}>
              {createSnapshot.isPending ? 'Creating...' : 'Create Snapshot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snapshot Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSnapshot?.name || 'Snapshot Details'}</DialogTitle>
            <DialogDescription>{selectedSnapshot?.description || 'No description'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{selectedSnapshot?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{selectedSnapshot?.name || 'Unnamed'}</span>
            </div>
            {selectedSnapshot?.description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description</span>
                <span className="max-w-[60%] truncate text-right">{selectedSnapshot.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch</span>
              <span>{selectedSnapshot ? getBranchName(selectedSnapshot.branch_id) : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch ID</span>
              <span className="font-mono text-xs">{selectedSnapshot?.branch_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{selectedSnapshot ? new Date(selectedSnapshot.created_at).toLocaleString() : ''}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDetailOpen(false); if (selectedSnapshot) setRestoreConfirmId(selectedSnapshot.id) }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Restore
            </Button>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <DeleteConfirmModal
        open={!!restoreConfirmId}
        onCancel={() => setRestoreConfirmId(null)}
        title="Restore Snapshot"
        description="Are you sure? This will revert the workspace to this snapshot. Unsaved changes may be lost."
        action={{ type: 'custom', label: 'Restore', variant: 'default' }}
        onConfirm={() => restoreConfirmId && handleRestore(restoreConfirmId)}
        isPending={restoreVersion.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmModal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete Snapshot"
        description="Are you sure you want to delete this snapshot? This action cannot be undone."
        action={{ type: 'delete' }}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        isPending={deleteSnapshot.isPending}
      />
    </motion.div>
  )
}
