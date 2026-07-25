import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, Archive, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmAction {
  type: 'delete' | 'archive' | 'custom'
  label?: string
  description?: string
  variant?: 'destructive' | 'default'
}

interface DeleteConfirmModalProps {
  open: boolean
  title: string
  description?: string
  action?: ConfirmAction
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}

const ACTION_CONFIG = {
  delete: {
    icon: Trash2,
    label: 'Delete',
    description: 'This action cannot be undone.',
    variant: 'destructive' as const,
  },
  archive: {
    icon: Archive,
    label: 'Archive',
    description: 'This item will be moved to the archive.',
    variant: 'default' as const,
  },
  custom: {
    icon: AlertTriangle,
    label: 'Confirm',
    description: '',
    variant: 'destructive' as const,
  },
}

export function DeleteConfirmModal({
  open,
  title,
  description,
  action = { type: 'delete' },
  onConfirm,
  onCancel,
  isPending = false,
}: DeleteConfirmModalProps) {
  const config = {
    ...ACTION_CONFIG[action.type],
    ...action,
  }
  const Icon = config.icon

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
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative z-10 w-full max-w-sm rounded-xl border bg-background p-0 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start gap-4 px-6 pt-6">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  config.variant === 'destructive'
                    ? 'bg-destructive/10'
                    : 'bg-muted'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    config.variant === 'destructive'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">{title}</h2>
                {description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </p>
                )}
                {config.description && !description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {config.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant={config.variant}
                size="sm"
                onClick={onConfirm}
                disabled={isPending}
              >
                {isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                ) : (
                  config.label
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
