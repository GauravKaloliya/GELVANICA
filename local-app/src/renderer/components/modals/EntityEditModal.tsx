import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateEntity, useEntityTypes } from '@/hooks/useEntity'
import { useStore } from '@/store'
import type { Entity } from '@shared/types'

interface EntityEditModalProps {
  open: boolean
  entity: Entity | null
  onClose: () => void
}

export function EntityEditModal({ open, entity, onClose }: EntityEditModalProps) {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const updateEntity = useUpdateEntity()
  const { data: typesData } = useEntityTypes(activeWorkspaceId ?? undefined)

  const entityTypes = ((typesData as { data?: Array<{ id: string; name: string }> })?.data ?? []) as Array<{
    id: string
    name: string
  }>

  const [title, setTitle] = useState(entity?.title ?? '')
  const [icon, setIcon] = useState(entity?.icon ?? '')
  const [entityTypeId, setEntityTypeId] = useState(entity?.entity_type_id ?? '')

  // Sync when entity changes
  if (entity && title !== entity.title) {
    setTitle(entity.title)
    setIcon(entity.icon ?? '')
    setEntityTypeId(entity.entity_type_id ?? '')
  }

  const handleSubmit = () => {
    if (!entity) return
    updateEntity.mutate(
      {
        id: entity.id,
        data: {
          title: title.trim() || null,
          icon: icon || null,
        },
      },
      {
        onSuccess: () => onClose(),
      }
    )
  }

  return (
    <AnimatePresence>
      {open && entity && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative z-10 w-full max-w-md rounded-xl border bg-background p-0 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Pencil className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Edit Entity</h2>
                  <p className="text-xs text-muted-foreground">Update entity details</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-4 px-6 py-4">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Title
                </label>
                <Input
                  placeholder="Untitled"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                />
              </div>

              {/* Icon */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Icon <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <Input
                  placeholder="Emoji or icon name"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                />
              </div>

              {/* Entity Type (read-only for now) */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Type
                </label>
                <Select
                  value={entityTypeId}
                  onValueChange={setEntityTypeId}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={updateEntity.isPending}
              >
                {updateEntity.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
