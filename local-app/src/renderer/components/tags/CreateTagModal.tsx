import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tag as TagIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useCreateTag } from '@/hooks/useTags'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6b7280',
]

export function CreateTagModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const createTag = useCreateTag()
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])

  const handleCreate = () => {
    if (!name.trim()) return
    createTag.mutate(
      {
        name: name.trim(),
        color,
        workspace_id: activeWorkspaceId ?? '',
      },
      {
        onSuccess: () => {
          setName('')
          setColor(TAG_COLORS[0])
          onClose()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Create Tag
          </DialogTitle>
          <DialogDescription>
            Tags help organize and filter your entities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              placeholder="e.g. research, todo, important"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') onClose()
              }}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => (
                <motion.button
                  key={c}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    color === c
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'hover:ring-1 hover:ring-muted-foreground/30'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <div className="flex items-center gap-2 rounded-md border p-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm font-medium" style={{ color }}>
                {name || 'Tag name'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createTag.isPending}>
            {createTag.isPending ? 'Creating...' : 'Create Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
