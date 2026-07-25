import { useState, useCallback, memo } from 'react'
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { BlockContentRenderer, getBlockText } from './BlockContentRenderer'
import type { Block, BlockContent } from '@shared/types'

export const BlockItem = memo(function BlockItem({
  block,
  index,
  totalBlocks,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onDuplicate,
  onDragStart,
  onDrop,
}: {
  block: Block
  index: number
  totalBlocks: number
  onUpdate: (content: BlockContent) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddBelow: () => void
  onDuplicate: () => void
  onDragStart?: (index: number) => void
  onDrop?: (fromIndex: number, toIndex: number) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const text = getBlockText(block.content)
  const indent = block.indent ?? 0

  const handleTextChange = useCallback(
    (value: string) => {
      if ('text' in block.content) {
        onUpdate({ ...block.content, text: value } as BlockContent)
      }
    },
    [block.content, onUpdate]
  )

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      if ('checked' in block.content) {
        onUpdate({ ...block.content, checked } as BlockContent)
      }
    },
    [block.content, onUpdate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onAddBelow()
      } else if (e.key === 'Backspace' && text === '' && index > 0) {
        e.preventDefault()
        onDelete()
      } else if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault()
        onMoveUp()
      } else if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault()
        onMoveDown()
      }
    },
    [text, index, onAddBelow, onDelete, onMoveUp, onMoveDown]
  )

  return (
    <div
      className={cn('block-wrapper group relative', 'rounded-md hover:bg-muted/30')}
      style={{ marginLeft: `${indent * 24}px` }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
      onDrop={(e) => {
        e.preventDefault()
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
        if (!isNaN(fromIndex) && fromIndex !== index) {
          onDrop?.(fromIndex, index)
        }
        setIsDragging(false)
      }}
    >
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded hover:bg-muted cursor-grab",
            isDragging && "opacity-50"
          )}
          draggable
          aria-label="Drag to reorder block"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', String(index))
            setIsDragging(true)
            onDragStart?.(index)
          }}
          onDragEnd={() => setIsDragging(false)}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-0.5 rounded-md border bg-background shadow-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onAddBelow} className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" aria-label="Add block below">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add block below</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" aria-label="Block options">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-50 w-48 rounded-md border bg-popover p-1 shadow-lg">
                <button onClick={() => { onMoveUp(); setShowMenu(false) }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent" disabled={index === 0}>
                  <ArrowUp className="h-3.5 w-3.5" /> Move up
                </button>
                <button onClick={() => { onMoveDown(); setShowMenu(false) }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent" disabled={index === totalBlocks - 1}>
                  <ArrowDown className="h-3.5 w-3.5" /> Move down
                </button>
                <button onClick={() => { onDuplicate(); setShowMenu(false) }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                <Separator className="my-1" />
                <button onClick={() => { onDelete(); setShowMenu(false) }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 px-3 py-1">
        <BlockContentRenderer
          block={block}
          text={text}
          onTextChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onCheckedChange={handleCheckedChange}
          index={index}
        />
      </div>
    </div>
  )
})
