import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HardDrive, Grid3X3, List, Upload, ArrowLeft, Settings2, Trash2, Download, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import FileGrid from '@/components/files/FileGrid'
import { FileUpload } from '@/components/files/FileUpload'
import { FilePreview } from '@/components/preview/FilePreview'
import { StorageIndicator } from '@/components/files/StorageIndicator'
import { useFiles, useDeleteFile, useCleanupOrphans } from '@/hooks/useFiles'
import { useIpc } from '@/hooks/useIpc'
import { usePermissions } from '@/hooks/usePermissions'
import { useStore } from '@/store'
import { cn, formatBytes } from '@/lib/utils'
import { VirtualList } from '@/components/common/VirtualList'
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal'
import type { GnoviumFile } from '@shared/types'

import { API_BASE } from '@lib/api/client'

type ViewMode = 'grid' | 'list'

export default function FileManager() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedFile, setSelectedFile] = useState<GnoviumFile | null>(null)
  const [previewFile, setPreviewFile] = useState<GnoviumFile | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)

  const { data: filesData, isLoading } = useFiles(activeWorkspaceId ?? undefined)
  const deleteFile = useDeleteFile()
  const cleanupOrphans = useCleanupOrphans()
  const { canWrite, canDelete } = usePermissions()
  const { invoke } = useIpc()

  const files = ((filesData as { data?: GnoviumFile[] })?.data ?? []) as GnoviumFile[]

  const handleDownload = useCallback(async (file: GnoviumFile) => {
    invoke('file:download', file.id)
  }, [invoke])

  const handleDelete = useCallback(
    (file: GnoviumFile) => {
      setDeletingFileId(file.id)
    },
    []
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full"
    >
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            <h1 className="font-semibold">File Manager</h1>
            <span className="text-xs text-muted-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-md border p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded p-1.5 transition-colors',
                  viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded p-1.5 transition-colors',
                  viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {canWrite && (
              <Button
                size="sm"
                variant={showUpload ? 'default' : 'outline'}
                onClick={() => setShowUpload(!showUpload)}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload
              </Button>
            )}
          </div>
        </div>

        {/* Upload zone */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b"
            >
              <div className="p-4">
                <FileUpload workspaceId={activeWorkspaceId ?? undefined} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Storage indicator */}
        <div className="border-b px-4 py-3">
          <StorageIndicator files={files} isLoading={isLoading} />
        </div>

        {/* Files */}
        <div className="flex-1 overflow-auto p-4">
          {viewMode === 'grid' ? (
            <FileGrid
              files={files}
              isLoading={isLoading}
              onSelect={setSelectedFile}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onPreview={setPreviewFile}
            />
          ) : (
            <VirtualList
              items={files}
              height="100%"
              estimateSize={56}
              renderItem={({ item: file }) => (
                <div className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-muted/30">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.file_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(file.file_size)} · {file.mime_type}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDownload(file)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleDelete(file)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            />
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between border-t px-4 py-1.5 text-xs text-muted-foreground">
          <span>
            {files.length} item{files.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              if (confirm('Clean up orphaned files?')) {
                cleanupOrphans.mutate(undefined, {
                  onSuccess: (result) => {
                    toast.success(`Cleaned up ${result.deleted} orphaned files`)
                  },
                })
              }
            }}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            Cleanup orphans
          </button>
        </div>
      </div>

      {/* Details sidebar */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border-l"
          >
            <div className="flex h-full w-[280px] flex-col">
              <div className="mb-4 flex items-center justify-between px-4 pt-4">
                <h3 className="text-sm font-semibold">File Details</h3>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Close file details"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col items-center px-4">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                  <HardDrive className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="mb-3 text-center text-sm font-medium break-all">
                  {selectedFile.file_name}
                </p>
                <div className="w-full space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Size</span>
                    <span>{(selectedFile.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span>{selectedFile.mime_type}</span>
                  </div>
                  {selectedFile.created_at && (
                    <div className="flex justify-between">
                      <span>Created</span>
                      <span>{new Date(selectedFile.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="break-all">
                    <span className="block text-muted-foreground/70">Object Key</span>
                    <span className="text-foreground">{selectedFile.object_key}</span>
                  </div>
                </div>
                <div className="mt-4 flex w-full gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(selectedFile)}
                  >
                    Download
                  </Button>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(selectedFile)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setPreviewFile(null)}
          >
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            <div onClick={(e) => e.stopPropagation()}>
              <FilePreview
                url={`${API_BASE}/api/v1/files/${previewFile.id}/download`}
                fileName={previewFile.file_name}
                mimeType={previewFile.mime_type}
                onClose={() => setPreviewFile(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmModal
        open={!!deletingFileId}
        onCancel={() => setDeletingFileId(null)}
        title="Delete File"
        description={`Are you sure you want to delete "${files.find((f) => f.id === deletingFileId)?.file_name ?? ''}"? This action cannot be undone.`}
        action={{ type: 'delete' }}
        onConfirm={() => {
          if (deletingFileId) {
            deleteFile.mutate(deletingFileId, {
              onSuccess: () => {
                if (selectedFile?.id === deletingFileId) setSelectedFile(null)
                setDeletingFileId(null)
              },
            })
          }
        }}
        isPending={deleteFile.isPending}
      />
    </motion.div>
  )
}
