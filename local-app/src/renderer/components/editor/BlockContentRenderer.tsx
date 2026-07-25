import { memo, useMemo } from 'react'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  FileText,
  Quote,
  Minus,
  Image,
  Table,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockTextarea } from './BlockTextarea'
import type { Block, BlockContent, BlockType, ToDoContent, CodeContent, CalloutContent, ImageContent, TableContent, ToggleContent, TextContent } from '@shared/types'

export function getDefaultContent(type: BlockType): BlockContent {
  switch (type) {
    case 'to_do': return { text: '', checked: false } as ToDoContent
    case 'code': return { text: '', language: 'javascript' } as CodeContent
    case 'callout': return { text: '', icon: '💡' } as CalloutContent
    case 'image': return { url: '', alt: '' } as ImageContent
    case 'divider': return {} as Record<string, never>
    case 'table': return { rows: [], columns: ['Column 1', 'Column 2'] } as TableContent
    case 'toggle': return { text: '', open: false } as ToggleContent
    default: return { text: '' } as TextContent
  }
}

export function getBlockText(content: BlockContent): string {
  if ('text' in content) return (content as { text: string }).text
  if ('title' in content) return (content as { title: string }).title
  if ('url' in content) return (content as { url: string }).url
  if ('caption' in content) return (content as { caption: string }).caption
  return ''
}

const BLOCK_CONFIGS: Record<string, { icon: typeof Type; label: string; placeholder: string }> = {
  text: { icon: Type, label: 'Text', placeholder: 'Type something...' },
  heading_1: { icon: Heading1, label: 'Heading 1', placeholder: 'Heading 1' },
  heading_2: { icon: Heading2, label: 'Heading 2', placeholder: 'Heading 2' },
  heading_3: { icon: Heading3, label: 'Heading 3', placeholder: 'Heading 3' },
  bulleted_list: { icon: List, label: 'Bullet List', placeholder: 'List item' },
  numbered_list: { icon: ListOrdered, label: 'Numbered List', placeholder: 'List item' },
  to_do: { icon: CheckSquare, label: 'Todo', placeholder: 'To-do item' },
  code: { icon: Code, label: 'Code', placeholder: 'Code...' },
  file: { icon: FileText, label: 'File', placeholder: 'File reference...' },
  quote: { icon: Quote, label: 'Quote', placeholder: 'Quote...' },
  divider: { icon: Minus, label: 'Divider', placeholder: '' },
  image: { icon: Image, label: 'Image', placeholder: 'Image URL...' },
  table: { icon: Table, label: 'Table', placeholder: 'Table data...' },
  callout: { icon: FileText, label: 'Callout', placeholder: 'Callout text...' },
  toggle: { icon: List, label: 'Toggle', placeholder: 'Toggle text...' },
}

const DEFAULT_CONFIG = BLOCK_CONFIGS.text!

interface BlockContentRendererProps {
  block: Block
  text: string
  onTextChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onCheckedChange?: (checked: boolean) => void
  index: number
}

export const BlockContentRenderer = memo(function BlockContentRenderer({
  block,
  text,
  onTextChange,
  onKeyDown,
  onCheckedChange,
}: BlockContentRendererProps) {
  const blockType = block.block_type
  const config = BLOCK_CONFIGS[blockType] ?? DEFAULT_CONFIG

  const textareaClassName = useMemo(() => {
    switch (blockType) {
      case 'heading_1': return 'text-2xl font-bold min-h-[2.5rem]'
      case 'heading_2': return 'text-xl font-semibold min-h-[2.25rem]'
      case 'heading_3': return 'text-lg font-medium min-h-[2rem]'
      case 'quote': return 'text-muted-foreground italic border-l-2 border-primary pl-4'
      case 'code': return 'font-mono text-sm bg-muted rounded p-3'
      default: return 'min-h-[1.5rem]'
    }
  }, [blockType])

  if (blockType === 'divider') {
    return <hr className="my-4 border-border" />
  }

  if (blockType === 'to_do') {
    const checked = 'checked' in block.content ? (block.content as { checked: boolean }).checked : false
    return (
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="mt-2 h-4 w-4 rounded border-input"
          aria-label={`Toggle todo: ${text || 'empty task'}`}
        />
        <BlockTextarea
          value={text}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          placeholder={config.placeholder}
          className={cn('flex-1', text && checked && 'line-through text-muted-foreground')}
        />
      </div>
    )
  }

  if (blockType === 'image' || blockType === 'table') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <config.icon className="h-3 w-3" />
          <span>{config.label}</span>
        </div>
        <BlockTextarea
          value={text}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          placeholder={config.placeholder}
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <BlockTextarea
      value={text}
      onChange={onTextChange}
      onKeyDown={onKeyDown}
      placeholder={config.placeholder}
      className={cn('flex-1', textareaClassName)}
    />
  )
})
