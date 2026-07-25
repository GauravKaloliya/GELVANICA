import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  Hash,
  Code,
  Quote,
  Image,
  Minus,
  Table2,
  ChevronRight,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateEntity, useEntityTypes } from '@/hooks/useEntity'
import { useStore } from '@/store'

const ENTITY_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  heading_1: Hash,
  code: Code,
  quote: Quote,
  image: Image,
  divider: Minus,
  table: Table2,
  toggle: ChevronRight,
}

interface EntityCreateModalProps {
  open: boolean
  onClose: () => void
}

export function EntityCreateModal({ open, onClose }: EntityCreateModalProps) {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const createEntity = useCreateEntity()
  const { data: typesData } = useEntityTypes(activeWorkspaceId ?? undefined)

  const entityTypes = ((typesData as { data?: Array<{ id: string; name: string; icon?: string }> })?.data ?? []) as Array<{
    id: string
    name: string
    icon?: string
  }>

  const [title, setTitle] = useState('')
  const [entityTypeId, setEntityTypeId] = useState('')
  const [icon, setIcon] = useState('')

  const handleSubmit = () => {
    if (!activeWorkspaceId) return
    createEntity.mutate(
      {
        workspace_id: activeWorkspaceId,
        entity_type_id: entityTypeId || (entityTypes[0]?.id ?? ''),
        title: title.trim() || undefined,
        icon: icon || undefined,
      },
      {
        onSuccess: () => {
          setTitle('')
          setEntityTypeId('')
          setIcon('')
          onClose()
        },
      }
    )
  }

  return (
    <AnimatePresence>
      {open && (
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
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Create Entity</h2>
                  <p className="text-xs text-muted-foreground">Add a new page to your workspace</p>
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
              {/* Entity Type */}
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
                    {entityTypes.map((type) => {
                      const Icon = ENTITY_TYPE_ICONS[type.icon ?? ''] ?? FileText
                      return (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {type.name}
                          </div>
                        </SelectItem>
                      )
                    })}
                    {entityTypes.length === 0 && (
                      <SelectItem value="default">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          Default
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

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

              {/* Icon (optional) */}
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
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={createEntity.isPending}
              >
                {createEntity.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Create
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
