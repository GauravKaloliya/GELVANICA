import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitMerge,
  AlertTriangle,
  ArrowRight,
  X,
  GitBranch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBranches } from '@/hooks/useBranches'
import type { Branch } from '@shared/types'

interface BranchMergeModalProps {
  open: boolean
  onClose: () => void
  onMerge: (sourceBranchId: string, targetBranchId: string) => void
  isPending?: boolean
}

export function BranchMergeModal({
  open,
  onClose,
  onMerge,
  isPending = false,
}: BranchMergeModalProps) {
  const { data: branchesData, isLoading } = useBranches()
  const branches = ((branchesData as { data?: Branch[] })?.data ?? []) as Branch[]

  const defaultBranch = branches.find((b) => b.is_default)
  const [sourceBranchId, setSourceBranchId] = useState<string>('')
  const [targetBranchId, setTargetBranchId] = useState<string>('')

  // Auto-set target to default branch
  useMemo(() => {
    if (defaultBranch && !targetBranchId) {
      setTargetBranchId(defaultBranch.id)
    }
  }, [defaultBranch, targetBranchId])

  const sourceBranch = branches.find((b) => b.id === sourceBranchId)
  const targetBranch = branches.find((b) => b.id === targetBranchId)
  const canMerge = sourceBranchId && targetBranchId && sourceBranchId !== targetBranchId

  const handleSubmit = () => {
    if (!canMerge) return
    onMerge(sourceBranchId, targetBranchId)
  }

  const handleClose = () => {
    setSourceBranchId('')
    onClose()
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
            onClick={handleClose}
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
                  <GitMerge className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Merge Branches</h2>
                  <p className="text-xs text-muted-foreground">
                    Merge one branch into another
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : branches.length < 2 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Not enough branches</p>
                  <p className="text-xs text-muted-foreground">
                    Create at least two branches to merge.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Source branch */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Source branch <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={sourceBranchId}
                      onValueChange={setSourceBranchId}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select source branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{branch.name}</span>
                              {branch.is_default && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                  default
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Target branch */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Target branch <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={targetBranchId}
                      onValueChange={setTargetBranchId}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select target branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{branch.name}</span>
                              {branch.is_default && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                  default
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Warning */}
                  {canMerge && (
                    <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      <div className="text-xs">
                        <p className="font-medium text-yellow-600 dark:text-yellow-400">
                          Merging may cause conflicts
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          Changes from <strong>{sourceBranch?.name}</strong> will be merged into{' '}
                          <strong>{targetBranch?.name}</strong>. Conflicts will be reported.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!canMerge || isPending}
              >
                {isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                ) : (
                  <>
                    <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                    Merge
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
