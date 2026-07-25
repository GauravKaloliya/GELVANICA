import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseInlineMarkdown(text: string): string {
  let result = text
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
  result = result.replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">$1</code>')
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank" rel="noopener">$1</a>')
  result = result.replace(/~~(.+?)~~/g, '<del>$1</del>')
  return result
}

function parseMarkdown(content: string): string {
  const lines = content.split('\n')
  const html: string[] = []
  let inCodeBlock = false
  let codeContent = ''
  let inList = false
  let listType = ''
  let listItems: string[] = []

  function flushList() {
    if (inList && listItems.length > 0) {
      const tag = listType === 'ol' ? 'ol' : 'ul'
      const cls = tag === 'ul' ? 'list-disc' : 'list-decimal'
      html.push(`<${tag} class="${cls} ml-6 space-y-1 mb-4">`)
      for (const item of listItems) {
        html.push(`<li>${parseInlineMarkdown(escapeHtml(item))}</li>`)
      }
      html.push(`</${tag}>`)
      listItems = []
      inList = false
    }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre class="mb-4 overflow-x-auto rounded-lg border bg-muted/50 p-4"><code class="text-sm font-mono">${codeContent}</code></pre>`)
        inCodeBlock = false
        codeContent = ''
      } else {
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      continue
    }

    const h1Match = line.match(/^# (.+)$/)
    if (h1Match) { flushList(); html.push(`<h1 class="mb-4 mt-6 text-3xl font-bold">${parseInlineMarkdown(escapeHtml(h1Match[1] ?? ''))}</h1>`); continue }
    const h2Match = line.match(/^## (.+)$/)
    if (h2Match) { flushList(); html.push(`<h2 class="mb-3 mt-5 text-2xl font-semibold">${parseInlineMarkdown(escapeHtml(h2Match[1] ?? ''))}</h2>`); continue }
    const h3Match = line.match(/^### (.+)$/)
    if (h3Match) { flushList(); html.push(`<h3 class="mb-2 mt-4 text-xl font-semibold">${parseInlineMarkdown(escapeHtml(h3Match[1] ?? ''))}</h3>`); continue }
    const h4Match = line.match(/^#### (.+)$/)
    if (h4Match) { flushList(); html.push(`<h4 class="mb-2 mt-3 text-lg font-medium">${parseInlineMarkdown(escapeHtml(h4Match[1] ?? ''))}</h4>`); continue }

    if (line.startsWith('> ')) {
      flushList()
      html.push(`<blockquote class="mb-4 border-l-4 border-primary/30 pl-4 text-muted-foreground italic">${parseInlineMarkdown(escapeHtml(line.slice(2)))}</blockquote>`)
      continue
    }

    if (line.match(/^[-*] /)) {
      if (!inList) { inList = true; listType = 'ul' }
      listItems.push(line.slice(2))
      continue
    }
    if (line.match(/^\d+\. /)) {
      if (!inList) { inList = true; listType = 'ol' }
      listItems.push(line.replace(/^\d+\. /, ''))
      continue
    }

    if (line.startsWith('---')) {
      flushList()
      html.push('<hr class="my-6 border-border" />')
      continue
    }

    if (line.trim() === '') {
      flushList()
      html.push('')
      continue
    }

    flushList()
    html.push(`<p class="mb-3 leading-relaxed">${parseInlineMarkdown(escapeHtml(line))}</p>`)
  }

  flushList()
  if (inCodeBlock) {
    html.push(`<pre class="mb-4 overflow-x-auto rounded-lg border bg-muted/50 p-4"><code class="text-sm font-mono">${codeContent}</code></pre>`)
  }

  return html.join('\n')
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span', 'del', 'input'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'type', 'checked', 'disabled'],
  ALLOW_DATA_ATTR: false,
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    const raw = parseMarkdown(content)
    return DOMPurify.sanitize(raw, SANITIZE_CONFIG)
  }, [content])

  return (
    <div className={cn('prose-invert max-w-none px-4 py-3 text-sm', className)}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
