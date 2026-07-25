import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Image,
  Table,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlockType } from '@shared/types'
import type { Editor } from '@tiptap/react'

export interface SlashMenuCommand {
  type: BlockType
  label: string
  icon: typeof Type
  keywords: string[]
}

const SLASH_COMMANDS: SlashMenuCommand[] = [
  { type: 'text', label: 'Text', icon: Type, keywords: ['text', 'paragraph', 'plain'] },
  { type: 'heading_1', label: 'Heading 1', icon: Heading1, keywords: ['heading', 'h1', 'title'] },
  { type: 'heading_2', label: 'Heading 2', icon: Heading2, keywords: ['heading', 'h2', 'subtitle'] },
  { type: 'heading_3', label: 'Heading 3', icon: Heading3, keywords: ['heading', 'h3'] },
  { type: 'bulleted_list', label: 'Bullet List', icon: List, keywords: ['list', 'bullet', 'ul'] },
  { type: 'numbered_list', label: 'Numbered List', icon: ListOrdered, keywords: ['list', 'numbered', 'ol'] },
  { type: 'to_do', label: 'To-do', icon: CheckSquare, keywords: ['todo', 'checkbox', 'task'] },
  { type: 'code', label: 'Code Block', icon: Code, keywords: ['code', 'snippet', 'pre'] },
  { type: 'quote', label: 'Blockquote', icon: Quote, keywords: ['quote', 'blockquote'] },
  { type: 'divider', label: 'Divider', icon: Minus, keywords: ['divider', 'hr', 'line', 'separator'] },
  { type: 'image', label: 'Image', icon: Image, keywords: ['image', 'img', 'photo', 'picture'] },
  { type: 'table', label: 'Table', icon: Table, keywords: ['table', 'spreadsheet', 'grid'] },
]

function executeSlashCommand(editor: Editor, type: BlockType) {
  const chain = editor.chain().focus()

  switch (type) {
    case 'text':
      chain.setNode('paragraph').run()
      break
    case 'heading_1':
      chain.setNode('heading', { level: 1 }).run()
      break
    case 'heading_2':
      chain.setNode('heading', { level: 2 }).run()
      break
    case 'heading_3':
      chain.setNode('heading', { level: 3 }).run()
      break
    case 'bulleted_list':
      chain.toggleBulletList().run()
      break
    case 'numbered_list':
      chain.toggleOrderedList().run()
      break
    case 'to_do':
      chain.toggleTaskList().run()
      break
    case 'code':
      chain.toggleCodeBlock().run()
      break
    case 'quote':
      chain.toggleBlockquote().run()
      break
    case 'divider':
      chain.setHorizontalRule().run()
      break
    case 'image':
      chain.setImage({ src: '' }).run()
      break
    case 'table':
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      break
  }
}

interface SlashMenuProps {
  onSelect: (type: BlockType) => void
  onClose: () => void
  query?: string
  position?: { top: number; left: number }
  editor?: Editor | null
}

export function SlashMenu({ onSelect, onClose, query: externalQuery, position, editor }: SlashMenuProps) {
  const [internalQuery, setInternalQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const query = externalQuery ?? internalQuery

  const filtered = useMemo(() => {
    if (!query) return SLASH_COMMANDS
    const q = query.toLowerCase()
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q))
    )
  }, [query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (position) inputRef.current?.focus()
  }, [position])

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = useCallback(
    (type: BlockType) => {
      if (editor) {
        executeSlashCommand(editor, type)
      } else {
        onSelect(type)
      }
      onClose()
    },
    [editor, onSelect, onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex].type)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [filtered, selectedIndex, handleSelect, onClose]
  )

  const items = filtered.map((cmd, i) => {
    const Icon = cmd.icon
    return (
      <button
        key={cmd.type}
        role="option"
        aria-selected={i === selectedIndex}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm',
          'hover:bg-accent hover:text-accent-foreground',
          'transition-colors',
          i === selectedIndex && 'bg-accent text-accent-foreground'
        )}
        onClick={() => handleSelect(cmd.type)}
        onMouseEnter={() => setSelectedIndex(i)}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span>{cmd.label}</span>
      </button>
    )
  })

  if (position) {
    return (
      <div
        className="slash-menu fixed z-50 rounded-lg border bg-popover shadow-md"
        style={{ top: position.top, left: position.left }}
      >
        <input
          ref={inputRef}
          className="w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Filter block types..."
          value={internalQuery}
          onChange={(e) => setInternalQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Filter block types"
        />
        <div ref={listRef} className="max-h-64 overflow-y-auto p-1" role="listbox">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No matching blocks
            </div>
          ) : items}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="rounded-lg border bg-popover p-1 shadow-md max-h-64 overflow-y-auto"
      onKeyDown={handleKeyDown}
      role="listbox"
    >
      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-popover p-2 shadow-md text-sm text-muted-foreground">
          No results found
        </div>
      ) : items}
    </div>
  )
}
