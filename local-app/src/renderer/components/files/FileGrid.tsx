import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, File, Image, FileText, Music, Film, Archive,
  MoreHorizontal, Trash2, Download, Eye,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils'
import type { GnoviumFile } from '@shared/types'

const FILE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  image: Image,
  video: Film,
  audio: Music,
  text: FileText,
  archive: Archive,
  default: File,
}

function getFileCategory(mimeType: string): keyof typeof FILE_ICON_MAP {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('pdf')) return 'text'
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar')) return 'archive'
  return 'default'
}

function getFileColor(mimeType: string): string {
  const cat = getFileCategory(mimeType)
  const colors: Record<string, string> = {
    image: 'bg-emerald-500/10 text-emerald-500',
    video: 'bg-purple-500/10 text-purple-500',
    audio: 'bg-amber-500/10 text-amber-500',
    text: 'bg-blue-500/10 text-blue-500',
    archive: 'bg-orange-500/10 text-orange-500',
    default: 'bg-muted text-muted-foreground',
  }
  return colors[cat] ?? colors.default ?? ''
}

function FileGridItem({
  file,
  onSelect,
  onDownload,
  onDelete,
  onPreview,
}: {
  file: GnoviumFile
  onSelect: (f: GnoviumFile) => void
  onDownload: (f: GnoviumFile) => void
  onDelete: (f: GnoviumFile) => void
  onPreview: (f: GnoviumFile) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const category = getFileCategory(file.mime_type)
  const Icon = FILE_ICON_MAP[category] ?? FILE_ICON_MAP.default ?? File
  const colorClass = getFileColor(file.mime_type)
  const isImage = file.mime_type.startsWith('image/')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative"
    >
      <button
        onClick={() => onSelect(file)}
        className={cn(
          'flex w-full flex-col items-center rounded-lg border p-3 transition-all',
          'hover:border-accent-foreground/20 hover:bg-accent/30 hover:shadow-sm',
        )}
      >
        {/* Thumbnail or Icon */}
        <div className={cn('mb-2 flex h-16 w-16 items-center justify-center rounded-lg', colorClass)}>
          <Icon className="h-7 w-7" />
        </div>

        {/* Name */}
        <p className="w-full truncate text-center text-xs font-medium">{file.file_name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(file.file_size)}</p>
      </button>

      {/* Actions */}
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            className="rounded-md border bg-background p-1 shadow-sm hover:bg-muted"
            aria-label="File options"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-8 z-50 w-40 rounded-md border bg-popover p-1 shadow-lg"
                onMouseLeave={() => setShowMenu(false)}
              >
                {isImage && (
                  <button
                    onClick={() => { onPreview(file); setShowMenu(false) }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                )}
                <button
                  onClick={() => { onDownload(file); setShowMenu(false) }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <Download className="h-3 w-3" /> Download
                </button>

                <button
                  onClick={() => { onDelete(file); setShowMenu(false) }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function FileListItem({
  file,
  onDownload,
  onDelete,
}: {
  file: GnoviumFile
  onDownload: (f: GnoviumFile) => void
  onDelete: (f: GnoviumFile) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const category = getFileCategory(file.mime_type)
  const Icon = FILE_ICON_MAP[category] ?? FILE_ICON_MAP.default ?? File
  const colorClass = getFileColor(file.mime_type)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-muted/30"
    >
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.file_name}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatBytes(file.file_size)} · {file.mime_type}
        </p>
      </div>

      <span className="text-[11px] text-muted-foreground shrink-0">
        {formatRelativeTime(file.created_at ?? file.uploaded_at)}
      </span>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
          aria-label="File options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 top-8 z-50 w-36 rounded-md border bg-popover p-1 shadow-lg"
              onMouseLeave={() => setShowMenu(false)}
            >
              <button
                onClick={() => { onDownload(file); setShowMenu(false) }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
              >
                <Download className="h-3 w-3" /> Download
              </button>
              <button
                onClick={() => { onDelete(file); setShowMenu(false) }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

const FileGrid = React.memo(function FileGrid({
  files,
  isLoading,
  onSelect,
  onDownload,
  onDelete,
  onPreview,
}: {
  files?: GnoviumFile[]
  isLoading?: boolean
  onSelect: (f: GnoviumFile) => void
  onDownload: (f: GnoviumFile) => void
  onDelete: (f: GnoviumFile) => void
  onPreview: (f: GnoviumFile) => void
}) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-6 w-6 text-muted-foreground" />}
        title="No files uploaded"
        description="Drag and drop files here, or click Upload."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <AnimatePresence>
        {files.map((file) => (
          <FileGridItem
            key={file.id}
            file={file}
            onSelect={onSelect}
            onDownload={onDownload}
            onDelete={onDelete}
            onPreview={onPreview}
          />
        ))}
      </AnimatePresence>
    </div>
  )
})

export default FileGrid

export function FileList({
  files,
  isLoading,
  onDownload,
  onDelete,
}: {
  files?: GnoviumFile[]
  isLoading?: boolean
  onDownload: (f: GnoviumFile) => void
  onDelete: (f: GnoviumFile) => void
}) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-6 w-6 text-muted-foreground" />}
        title="No files uploaded"
        description="Drag and drop files here, or click Upload."
      />
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-0.5">
        {files.map((file) => (
          <FileListItem
            key={file.id}
            file={file}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
