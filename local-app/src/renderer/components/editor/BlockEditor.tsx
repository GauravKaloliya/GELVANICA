import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import Link from '@tiptap/extension-link'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import CodeBlock from '@tiptap/extension-code-block'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image } from '@tiptap/extension-image'
import { Toolbar } from './Toolbar'
import { SlashMenu } from './SlashMenu'
import type { Block, BlockContent, BlockType } from '@shared/types'

interface BlockEditorProps {
  blocks: Block[]
  onBlocksChange: (blocks: Block[]) => void
  onSave?: () => void
  entityTitle?: string
}

function getBlockText(content: BlockContent): string {
  if ('text' in content) return (content as { text: string }).text
  if ('url' in content) return (content as { url: string }).url
  return ''
}

function createBlockFromType(entityId: string, type: BlockType, position: number, text = ''): Block {
  let content: BlockContent
  switch (type) {
    case 'to_do':
      content = { text, checked: false }
      break
    case 'code':
      content = { text, language: 'javascript' }
      break
    case 'image':
      content = { url: '', alt: '' }
      break
    case 'divider':
      content = {}
      break
    case 'table':
      content = { rows: [], columns: ['Column 1', 'Column 2'] }
      break
    default:
      content = { text }
  }
  return {
    id: crypto.randomUUID(),
    entity_id: entityId,
    parent_block_id: null,
    block_type: type,
    position,
    indent: 0,
    content,
    content_hash: '',
    is_deleted: false,
    created_at: new Date().toISOString(),
  }
}

// ── Blocks ↔ ProseMirror conversion ──────────────────────────────────────────

function blocksToProseMirror(blocks: Block[]): object {
  const nodes: object[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]!

    if (block.block_type === 'bulleted_list') {
      const items: object[] = []
      while (i < blocks.length && blocks[i]!.block_type === 'bulleted_list') {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: textToContent(getBlockText(blocks[i]!.content)) }],
        })
        i++
      }
      nodes.push({ type: 'bulletList', content: items })
    } else if (block.block_type === 'numbered_list') {
      const items: object[] = []
      while (i < blocks.length && blocks[i]!.block_type === 'numbered_list') {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: textToContent(getBlockText(blocks[i]!.content)) }],
        })
        i++
      }
      nodes.push({ type: 'orderedList', content: items })
    } else if (block.block_type === 'to_do') {
      const items: object[] = []
      while (i < blocks.length && blocks[i]!.block_type === 'to_do') {
        const current = blocks[i]!
        const checked = 'checked' in current.content ? current.content.checked : false
        items.push({
          type: 'taskItem',
          attrs: { checked },
          content: [{ type: 'paragraph', content: textToContent(getBlockText(current.content)) }],
        })
        i++
      }
      nodes.push({ type: 'taskList', content: items })
    } else {
      nodes.push(blockToNode(block))
      i++
    }
  }

  return { type: 'doc', content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }] }
}

function textToContent(text: string): object[] {
  if (!text) return []
  return [{ type: 'text', text }]
}

function blockToNode(block: Block): object {
  const text = getBlockText(block.content)

  switch (block.block_type) {
    case 'heading_1':
      return { type: 'heading', attrs: { level: 1 }, content: textToContent(text) }
    case 'heading_2':
      return { type: 'heading', attrs: { level: 2 }, content: textToContent(text) }
    case 'heading_3':
      return { type: 'heading', attrs: { level: 3 }, content: textToContent(text) }
    case 'code': {
      const lang = 'language' in block.content ? block.content.language : undefined
      return {
        type: 'codeBlock',
        ...(lang ? { attrs: { language: lang } } : {}),
        content: textToContent(text),
      }
    }
    case 'quote':
      return { type: 'blockquote', content: [{ type: 'paragraph', content: textToContent(text) }] }
    case 'divider':
      return { type: 'horizontalRule' }
    case 'image': {
      const ic = block.content as { url?: string; alt?: string }
      return { type: 'image', attrs: { src: ic.url || '', alt: ic.alt || '' } }
    }
    case 'table': {
      const tc = block.content as { rows?: string[][]; columns?: string[] }
      const rows = tc.rows ?? []
      const cols = tc.columns ?? ['Column 1', 'Column 2']
      const tableRows = rows.length > 0 ? rows : [cols.map(() => '')]
      return {
        type: 'table',
        content: tableRows.map((row, ri) => ({
          type: 'tableRow',
          content: row.map((cell, ci) => ({
            type: ri === 0 && ci >= 0 ? 'tableHeader' : 'tableCell',
            content: [{ type: 'paragraph', content: textToContent(String(cell ?? '')) }],
          })),
        })),
      }
    }
    default:
      return { type: 'paragraph', content: textToContent(text) }
  }
}

// ── ProseMirror → Blocks ─────────────────────────────────────────────────────

interface ProseMirrorNode {
  type?: { name?: string }
  attrs?: Record<string, unknown>
  content?: { content?: ProseMirrorNode[] }
  text?: string
}

function extractNodeText(node: ProseMirrorNode): string {
  if (!node?.content?.content) return ''
  return node.content.content
    .map((child) => {
      if (child.text) return child.text
      if (child.content?.content) {
        return child.content.content.map((c) => c.text ?? '').join('')
      }
      return ''
    })
    .join('')
}

function prosemirrorToBlocks(doc: ProseMirrorNode, entityId: string): Block[] {
  const blocks: Block[] = []
  let position = 0

  for (const node of doc.content?.content ?? []) {
    const typeName = node.type?.name

    if (typeName === 'bulletList') {
      const items = node.content?.content ?? []
      for (const item of items) {
        const text = extractNodeText(item)
        blocks.push(createBlockFromType(entityId, 'bulleted_list', position++, text))
      }
    } else if (typeName === 'orderedList') {
      const items = node.content?.content ?? []
      for (const item of items) {
        const text = extractNodeText(item)
        blocks.push(createBlockFromType(entityId, 'numbered_list', position++, text))
      }
    } else if (typeName === 'taskList') {
      const items = node.content?.content ?? []
      for (const item of items) {
        const text = extractNodeText(item)
        const checked = (item.attrs?.checked as boolean) ?? false
        const block = createBlockFromType(entityId, 'to_do', position++, text)
        block.content = { text, checked }
        blocks.push(block)
      }
    } else {
      blocks.push(nodeToBlock(node, entityId, position++))
    }
  }

  return blocks
}

function nodeToBlock(node: ProseMirrorNode, entityId: string, position: number): Block {
  const typeName = node.type?.name
  const text = extractNodeText(node)

  switch (typeName) {
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1
      const blockType: BlockType = level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3'
      return createBlockFromType(entityId, blockType, position, text)
    }
    case 'codeBlock': {
      const lang = node.attrs?.language as string | undefined
      const block = createBlockFromType(entityId, 'code', position, text)
      if (lang && 'language' in block.content) {
        block.content = { ...block.content, language: lang }
      }
      return block
    }
    case 'blockquote':
      return createBlockFromType(entityId, 'quote', position, text)
    case 'horizontalRule':
      return createBlockFromType(entityId, 'divider', position)
    case 'image': {
      const block = createBlockFromType(entityId, 'image', position)
      block.content = { url: (node.attrs?.src as string) ?? '', alt: (node.attrs?.alt as string) ?? '' }
      return block
    }
    case 'table': {
      const rows = node.content?.content ?? []
      const parsedRows = rows.map((row) => {
        const cells = row.content?.content ?? []
        return cells.map((cell) => {
          return cell.content?.content
            ?.map((p) => p.content?.content?.map((t: ProseMirrorNode) => t.text ?? '').join('') ?? '')
            .join('') ?? ''
        })
      })
      const block = createBlockFromType(entityId, 'table', position)
      block.content = { rows: parsedRows }
      return block
    }
    case 'paragraph':
    default:
      return createBlockFromType(entityId, 'text', position, text)
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function BlockEditor({ blocks: initialBlocks, onBlocksChange, onSave, entityTitle }: BlockEditorProps) {
  const [slashMenu, setSlashMenu] = useState<{
    position: { top: number; left: number }
    query: string
  } | null>(null)
  const [slashQuery, setSlashQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const slashStartPos = useRef<number | null>(null)

  // Use refs for callbacks to avoid stale closures inside useEditor
  const onBlocksChangeRef = useRef(onBlocksChange)
  onBlocksChangeRef.current = onBlocksChange
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const entityIdRef = useRef(initialBlocks[0]?.entity_id ?? '')
  entityIdRef.current = initialBlocks[0]?.entity_id ?? ''

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            const level = node.attrs.level
            return `Heading ${level}`
          }
          return "Type '/' for commands…"
        },
      }),
      Mention.configure({
        suggestion: {
          char: '@',
          items: ({ query }: { query: string }) => {
            return [
              { id: 'self', label: 'You' },
            ].filter((item) =>
              item.label.toLowerCase().includes(query.toLowerCase())
            )
          },
        } satisfies Record<string, unknown>,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlock,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded-md' },
      }),
    ],
    content: blocksToProseMirror(initialBlocks),
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-[200px]',
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
          event.preventDefault()
          onSaveRef.current?.()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const newBlocks = prosemirrorToBlocks(json as unknown as ProseMirrorNode, entityIdRef.current)
      onBlocksChangeRef.current(newBlocks)
    },
  })

  // Sync external block changes into the editor
  const prevBlocksJsonRef = useRef<string>('')
  useEffect(() => {
    if (!editor) return
    const serialised = JSON.stringify(initialBlocks)
    if (serialised === prevBlocksJsonRef.current) return
    prevBlocksJsonRef.current = serialised

    const currentJson = JSON.stringify(editor.getJSON())
    const targetJson = JSON.stringify(blocksToProseMirror(initialBlocks))
    if (currentJson !== targetJson) {
      editor.commands.setContent(blocksToProseMirror(initialBlocks), { emitUpdate: false })
    }
  }, [editor, initialBlocks])

  // ── Slash command detection ──────────────────────────────────────────────

  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const { state } = editor
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '')

      // Check if the user just typed "/" at the start of a block or after a space
      const slashMatch = textBefore.match(/(^|\s)\/$/)
      if (slashMatch) {
        const slashPos = from - 1
        slashStartPos.current = slashPos

        // Get cursor coordinates for menu positioning
        const { view } = editor
        const coords = view.coordsAtPos(slashPos)
        setSlashMenu({
          position: { top: coords.bottom + 4, left: coords.left },
          query: '',
        })
        setSlashQuery('')
        return
      }

      // If slash menu is open, update query
      if (slashMenu && slashStartPos.current !== null) {
        const queryText = textBefore.slice(slashStartPos.current + 1)
        // If user typed a space or moved away, close the menu
        if (queryText.includes(' ') || queryText.length === 0) {
          // Only close if they actually moved away (not just opened)
          if (slashMenu.query !== '' || queryText.length > 1) {
            setSlashMenu(null)
            slashStartPos.current = null
          }
        } else {
          setSlashQuery(queryText)
        }
      }
    }

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, slashMenu])

  const handleSlashClose = useCallback(() => {
    setSlashMenu(null)
    slashStartPos.current = null
    editor?.commands.focus()
  }, [editor])

  const handleSlashSelect = useCallback(
    (type: BlockType) => {
      if (!editor || !slashMenu) return

      // Delete the slash command text (from slash to current position)
      const { state } = editor
      const { from } = state.selection
      if (slashStartPos.current !== null) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: slashStartPos.current, to: from })
          .run()
      }

      // Execute the slash command
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

      setSlashMenu(null)
      slashStartPos.current = null
    },
    [editor, slashMenu]
  )

  return (
    <div ref={containerRef} className="relative">
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 200px;
        }
        .ProseMirror > * + * {
          margin-top: 0.5em;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.5);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 { font-size: 1.875rem; font-weight: 700; line-height: 1.2; }
        .ProseMirror h2 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; }
        .ProseMirror h3 { font-size: 1.25rem; font-weight: 500; line-height: 1.4; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; }
        .ProseMirror li { margin-top: 0.25em; }
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1em;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .ProseMirror pre {
          background: hsl(var(--muted));
          border-radius: 0.375rem;
          padding: 0.75rem 1rem;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.875rem;
          overflow-x: auto;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
          font-size: inherit;
          color: inherit;
        }
        .ProseMirror code {
          background: hsl(var(--muted));
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.875em;
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1rem 0;
        }
        .ProseMirror img {
          max-width: 100%;
          border-radius: 0.375rem;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5rem 0;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 0.75rem;
          text-align: left;
          min-width: 80px;
        }
        .ProseMirror table th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .ProseMirror ul[data-type="taskList"] li label {
          margin-top: 0.25rem;
        }
        .ProseMirror ul[data-type="taskList"] li label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: hsl(var(--primary));
        }
        .ProseMirror .mention {
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          font-weight: 500;
        }
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }
      `}</style>

      {entityTitle && (
        <h1 className="mb-4 text-3xl font-bold tracking-tight">{entityTitle}</h1>
      )}

      <div className="mb-2 border-b pb-2">
        <Toolbar editor={editor} />
      </div>

      <div className="relative">
        <EditorContent editor={editor} className="prose-editor" />
      </div>

      {slashMenu && (
        <SlashMenu
          position={slashMenu.position}
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={handleSlashClose}
          editor={editor}
        />
      )}
    </div>
  )
}
