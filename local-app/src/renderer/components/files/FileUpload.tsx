import { useState, useCallback, useRef, DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudUpload, X, Check, AlertCircle, File as FileIcon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn, formatBytes } from '@/lib/utils'
import { useUploadFile } from '@/hooks/useFiles'
import type { GnoviumFile } from '@shared/types'

interface PendingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  result?: GnoviumFile
}

export function FileUpload({
  workspaceId,
  onUploadComplete,
  className,
}: {
  workspaceId?: string
  onUploadComplete?: (file: GnoviumFile) => void
  className?: string
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadFile = useUploadFile()

  const uploadSingleFile = useCallback(async (pf: PendingFile) => {
    setPendingFiles((prev) =>
      prev.map((p) => (p.id === pf.id ? { ...p, status: 'uploading', progress: 30 } : p))
    )

    try {
      const formData = new FormData()
      formData.append('file', pf.file)
      if (workspaceId) formData.append('workspace_id', workspaceId)

      const result = await uploadFile.mutateAsync(formData)

      const fileData = (result as unknown as GnoviumFile)

      setPendingFiles((prev) =>
        prev.map((p) =>
          p.id === pf.id ? { ...p, status: 'success', progress: 100, result: fileData } : p
        )
      )

      onUploadComplete?.(fileData)

      setTimeout(() => {
        setPendingFiles((prev) => prev.filter((p) => p.id !== pf.id))
      }, 2000)
    } catch (err) {
      setPendingFiles((prev) =>
        prev.map((p) =>
          p.id === pf.id
            ? { ...p, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
            : p
        )
      )
    }
  }, [uploadFile, workspaceId, onUploadComplete])

  const addFiles = useCallback((files: FileList | File[]) => {
    const newPending: PendingFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const,
    }))
    setPendingFiles((prev) => [...prev, ...newPending])

    newPending.forEach((pf) => {
      uploadSingleFile(pf)
    })
  }, [uploadSingleFile])

  const removePending = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id))
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <motion.div
          animate={isDragOver ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
          className={cn(
            'mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
            isDragOver ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
          )}
        >
          <CloudUpload className="h-6 w-6" />
        </motion.div>

        <p className="mb-1 text-sm font-medium">
          {isDragOver ? 'Drop files here' : 'Drag & drop files'}
        </p>
        <p className="text-xs text-muted-foreground">
          or <span className="text-primary underline underline-offset-2">click to browse</span>
        </p>
        <p className="mt-2 text-[10px] text-muted-foreground/60">
          Max file size: 100 MB
        </p>
      </div>

      {/* Pending uploads */}
      <AnimatePresence>
        {pendingFiles.map((pf) => (
          <motion.div
            key={pf.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-medium">{pf.file.name}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {formatBytes(pf.file.size)}
                  </span>
                </div>

                {pf.status === 'uploading' && (
                  <Progress value={pf.progress} className="mt-1.5 h-1" />
                )}

                {pf.status === 'error' && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {pf.error}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {pf.status === 'success' ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                ) : (
                  <button
                    onClick={() => removePending(pf.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
