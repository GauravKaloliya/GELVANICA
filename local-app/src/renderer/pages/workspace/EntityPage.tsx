import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEntity, useCreateEntity, useDeleteEntity, useEntityTypes } from '@/hooks/useEntity'
import { useEntityBlocks, useCreateBlock, useUpdateBlock, useDeleteBlock, useReorderBlocks } from '@/hooks/useBlocks'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useFiles } from '@/hooks/useFiles'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/router'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { BranchSelector } from '@/components/versions/BranchSelector'
import { FilePreview } from '@/components/preview/FilePreview'
import { useStore } from '@/store'
import { SlashMenu } from '@/components/editor/SlashMenu'
import { BlockItem } from '@/components/editor/BlockItem'
import { getDefaultContent } from '@/components/editor/BlockContentRenderer'
import { API_BASE } from '@lib/api/client'
import type { Block, BlockType, BlockContent, Entity, GnoviumFile } from '@shared/types'

export default function EntityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const entityId = id ?? ''
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const versionFilter = useStore((s) => s.versionFilter)
  const setVersionFilter = useStore((s) => s.setVersionFilter)

  const { data: entity, isLoading: entityLoading } = useEntity(entityId)
  const { data: blocksData, isLoading: blocksLoading } = useEntityBlocks(entityId)
  const { data: filesData } = useFiles(activeWorkspaceId ?? undefined)
  const createBlock = useCreateBlock()
  const updateBlock = useUpdateBlock()
  const deleteBlock = useDeleteBlock()
  const reorderBlocks = useReorderBlocks()
  const createEntity = useCreateEntity()
  const deleteEntity = useDeleteEntity()

  const { isSaving, isDirty } = useAutoSave()
  useKeyboardShortcuts()

  const { canWrite, canDelete } = usePermissions()
  const { data: entityTypesData } = useEntityTypes(activeWorkspaceId ?? undefined)

  const [title, setTitle] = useState('')
  const [slashMenu, setSlashMenu] = useState<{ blockIndex: number; position: { top: number; left: number } } | null>(null)
  const [previewFile, setPreviewFile] = useState<{url: string; name: string; mime?: string} | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const entityData = entity as Entity | undefined
  const entityTypes = ((entityTypesData as { data?: { id: string; name: string }[] })?.data ?? [])
  const entityTypeName = entityTypes.find((t) => t.id === entityData?.entity_type_id)?.name ?? 'Unknown type'
  const blocks = useMemo(() => ((blocksData as { data?: Block[] })?.data ?? []) as Block[], [blocksData])

  useEffect(() => {
    if (entityData?.title && !title) {
      setTitle(entityData.title)
    }
  }, [entityData?.title, title])

  const handleTitleChange = (value: string) => {
    setTitle(value)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const firstBlock = contentRef.current?.querySelector('textarea')
      firstBlock?.focus()
    }
  }

  const handleAddBlock = useCallback(
    (afterIndex: number, type: BlockType = 'text') => {
      createBlock.mutate({
        entity_id: entityId,
        block_type: type,
        position: afterIndex + 1,
        content: getDefaultContent(type),
      })
    },
    [createBlock, entityId]
  )

  const handleUpdateBlock = useCallback(
    (blockId: string, content: BlockContent) => {
      updateBlock.mutate({ id: blockId, data: { content } })
    },
    [updateBlock]
  )

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      deleteBlock.mutate(blockId)
    },
    [deleteBlock]
  )

  const handleMoveBlock = useCallback(
    (block: Block, direction: 'up' | 'down') => {
      const idx = blocks.findIndex((b) => b.id === block.id)
      const swapBlock = direction === 'up' ? blocks[idx - 1] : blocks[idx + 1]
      if (!swapBlock) return

      reorderBlocks.mutate({
        entity_id: entityId,
        blocks: blocks.map((b, i) => {
          if (i === idx) return { id: swapBlock.id, position: i }
          if (i === (direction === 'up' ? idx - 1 : idx + 1)) return { id: block.id, position: i }
          return { id: b.id, position: i }
        }),
      })
    },
    [blocks, entityId, reorderBlocks]
  )

  const handleDuplicateBlock = useCallback(
    (block: Block) => {
      createBlock.mutate({
        entity_id: entityId,
        block_type: block.block_type,
        position: block.position + 1,
        content: { ...block.content },
      })
    },
    [createBlock, entityId]
  )

  const handleDuplicateEntity = useCallback(() => {
    if (!entityData?.entity_type_id || !entityData?.workspace_id) return
    createEntity.mutate(
      { workspace_id: entityData.workspace_id, entity_type_id: entityData.entity_type_id, title: `${entityData.title} (copy)` },
      { onSuccess: () => navigate(ROUTES.DASHBOARD) }
    )
  }, [entityData, createEntity, navigate])

  const handleSlashSelect = useCallback(
    (type: BlockType) => {
      if (slashMenu) {
        handleAddBlock(slashMenu.blockIndex, type)
        setSlashMenu(null)
      }
    },
    [slashMenu, handleAddBlock]
  )

  if (entityLoading || blocksLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (!entityData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Entity not found</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.DASHBOARD)}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full"
    >
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b px-6 py-2 text-xs text-muted-foreground">
          <span>{entityTypeName}</span>
          <span>·</span>
          <span>{blocks.length} blocks</span>
          {isSaving && (
            <span className="text-muted-foreground">Saving…</span>
          )}
          {!isSaving && isDirty && (
            <span className="text-muted-foreground">Unsaved changes</span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDuplicateEntity}
              title="Duplicate Entity"
              disabled={createEntity.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => { deleteEntity.mutate(entityId); navigate(ROUTES.DASHBOARD) }}
                title="Delete Entity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <BranchSelector
              value={versionFilter.branchId ?? undefined}
              onChange={(branchId) => setVersionFilter({ branchId })}
            />
          </span>
        </div>

        <div className="flex-1 overflow-auto" ref={contentRef}>
          <div className="mx-auto max-w-[720px] px-8 py-12">
            <input
              ref={titleRef}
              className="mb-1 w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground"
              placeholder="Untitled"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              aria-label="Entity title"
            />

            <div className="mt-4 space-y-1">
              {blocks.map((block, i) => (
                <BlockItem
                  key={block.id}
                  block={block}
                  index={i}
                  totalBlocks={blocks.length}
                  onUpdate={(content) => canWrite && handleUpdateBlock(block.id, content)}
                  onDelete={() => canDelete && handleDeleteBlock(block.id)}
                  onMoveUp={() => canWrite && handleMoveBlock(block, 'up')}
                  onMoveDown={() => canWrite && handleMoveBlock(block, 'down')}
                  onAddBelow={() => canWrite && handleAddBlock(i)}
                  onDuplicate={() => canWrite && handleDuplicateBlock(block)}
                  onDragStart={() => {}}
                  onDrop={(fromIndex, toIndex) => {
                    const fromBlock = blocks[fromIndex]
                    const toBlock = blocks[toIndex]
                    if (!fromBlock || !toBlock) return

                    reorderBlocks.mutate({
                      entity_id: entityId,
                      blocks: blocks.map((b, idx) => {
                        if (idx === fromIndex) return { id: fromBlock.id, position: toIndex }
                        if (fromIndex < toIndex) {
                          if (idx > fromIndex && idx <= toIndex) return { id: b.id, position: idx - 1 }
                        } else {
                          if (idx >= toIndex && idx < fromIndex) return { id: b.id, position: idx + 1 }
                        }
                        return { id: b.id, position: idx }
                      }),
                    })
                  }}
                />
              ))}
            </div>

            {canWrite && (
              <button
                onClick={() => handleAddBlock(blocks.length)}
                className="mt-4 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add a block</span>
              </button>
            )}

            {((filesData as { data?: GnoviumFile[] })?.data ?? []).length > 0 && (
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachments
                </div>
                {((filesData as { data?: GnoviumFile[] })?.data ?? []).slice(0, 3).map((file) => (
                  <button
                      key={file.id}
                      onClick={() => setPreviewFile({ url: `${API_BASE}/api/v1/files/${file.id}/download`, name: file.file_name, mime: file.mime_type })}
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.file_name}</p>
                        <p className="text-[11px] text-muted-foreground">{file.mime_type}</p>
                      </div>
                    </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar — reusable component */}
      <RightSidebar entityId={entityId} />

      {/* File preview overlay */}
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
              aria-label="Close file preview"
            >
              <X className="h-5 w-5" />
            </button>
            <div onClick={(e) => e.stopPropagation()}>
              <FilePreview
                url={previewFile.url}
                fileName={previewFile.name}
                mimeType={previewFile.mime}
                onClose={() => setPreviewFile(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {slashMenu && (
        <SlashMenu
          position={slashMenu.position}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}
    </motion.div>
  )
}
