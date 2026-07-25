import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Save, Trash2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Workspace } from '@shared/types'

interface WorkspaceGeneralProps {
  workspace: Workspace
  onUpdate: (data: { name: string; description: string; is_archived: boolean }) => void
  onDelete?: (workspaceId: string) => void
  isUpdating?: boolean
}

export function WorkspaceGeneral({
  workspace,
  onUpdate,
  onDelete,
  isUpdating,
}: WorkspaceGeneralProps) {
  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description ?? '')
  const [isArchived, setIsArchived] = useState(workspace.is_archived ?? false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = useCallback(
    (field: string, value: string | boolean) => {
      if (field === 'name') setName(value as string)
      if (field === 'description') setDescription(value as string)
      if (field === 'is_archived') setIsArchived(value as boolean)
      setHasChanges(true)
    },
    []
  )

  const handleSave = () => {
    onUpdate({ name, description, is_archived: isArchived })
    setHasChanges(false)
  }

  const handleDelete = () => {
    if (deleteConfirmText === workspace.name && onDelete) {
      onDelete(workspace.id)
      setDeleteDialogOpen(false)
      setDeleteConfirmText('')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              General
              {workspace.is_default && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5">
                  Default
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Created {formatDate(workspace.created_at)}
              {workspace.updated_at !== workspace.created_at && (
                <> · Updated {formatDate(workspace.updated_at)}</>
              )}
            </CardDescription>
          </div>
          {hasChanges && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Button size="sm" onClick={handleSave} disabled={isUpdating || !name.trim()}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </motion.div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workspace name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My Workspace"
            className="max-w-md"
          />
        </div>

        <Separator />

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional description for this workspace..."
            rows={3}
            className="max-w-md"
          />
        </div>

        <Separator />

        {/* Archive toggle */}
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Archive workspace</p>
            <p className="text-xs text-muted-foreground">
              Archived workspaces are hidden from the workspace picker but data is preserved.
            </p>
          </div>
          <Switch
            checked={isArchived}
            onCheckedChange={(v) => handleChange('is_archived', v)}
          />
        </div>

        <Separator />

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Entities', value: workspace.entity_count ?? 0 },
            { label: 'Files', value: workspace.file_count ?? 0 },
            { label: 'Branches', value: workspace.branch_count ?? 0 },
            { label: 'Storage', value: `${(workspace.storage_used_bytes ?? 0) / 1024 / 1024} MB` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Danger zone */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete Workspace
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently delete this workspace and all its data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={(v) => !v && setDeleteDialogOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Delete Workspace
              </DialogTitle>
              <DialogDescription>
                This will permanently delete <strong>{workspace.name}</strong> and all its entities,
                blocks, and files. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <label className="text-sm font-medium">
                Type <span className="font-mono text-destructive">{workspace.name}</span> to confirm:
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={workspace.name}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirmText !== workspace.name}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
