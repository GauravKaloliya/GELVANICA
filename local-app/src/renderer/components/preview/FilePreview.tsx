import { useState, useEffect, useMemo } from 'react'
import { ImageViewer } from './ImageViewer'
import { PdfViewer } from './PdfViewer'
import { MarkdownPreview } from './MarkdownPreview'
import { CodeBlock } from './CodeBlock'
import { FileText } from 'lucide-react'

interface FilePreviewProps {
  url: string
  fileName: string
  mimeType?: string
  className?: string
  onClose?: () => void
}

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'])
const PDF_MIMES = new Set(['application/pdf'])
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx'])
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.html', '.css', '.scss', '.less',
  '.json', '.yaml', '.yml', '.xml', '.sql', '.sh', '.bash', '.zsh', '.ps1',
  '.dockerfile', '.makefile', '.graphql', '.gql', '.tf', '.hcl', '.vue', '.svelte',
  '.env', '.gitignore', '.toml', '.ini', '.cfg', '.conf',
])

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : ''
}

function guessLanguageFromExtension(ext: string): string | undefined {
  const map: Record<string, string> = {
    '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx',
    '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
    '.java': 'java', '.kt': 'kotlin', '.swift': 'swift',
    '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp',
    '.php': 'php', '.html': 'html', '.css': 'css', '.scss': 'scss',
    '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml',
    '.sql': 'sql', '.sh': 'bash', '.bash': 'bash', '.zsh': 'zsh',
    '.dockerfile': 'dockerfile', '.makefile': 'makefile',
    '.graphql': 'graphql', '.gql': 'graphql', '.tf': 'hcl',
    '.vue': 'vue', '.svelte': 'svelte', '.toml': 'toml',
    '.env': 'bash', '.gitignore': 'bash',
  }
  return map[ext]
}

function isTextMime(mime?: string): boolean {
  if (!mime) return false
  return mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml' || mime.includes('javascript') || mime.includes('typescript')
}

function NoPreview({ fileName, message }: { fileName: string; message?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <FileText className="h-12 w-12 opacity-40" />
      <p className="text-sm font-medium">{fileName}</p>
      <p className="text-xs">{message ?? 'Preview not available'}</p>
    </div>
  )
}

export function FilePreview({ url, fileName, mimeType, className, onClose }: FilePreviewProps) {
  const ext = useMemo(() => getExtension(fileName), [fileName])

  if (mimeType && IMAGE_MIMES.has(mimeType)) {
    return <ImageViewer src={url} alt={fileName} className={className} onClose={onClose} />
  }

  if (mimeType && PDF_MIMES.has(mimeType)) {
    return <PdfViewer src={url} fileName={fileName} className={className} onClose={onClose} />
  }

  if (MARKDOWN_EXTENSIONS.has(ext)) {
    return (
      <div className={`overflow-auto ${className ?? ''}`}>
        <MarkdownPreviewContent url={url} fileName={fileName} />
      </div>
    )
  }

  if (CODE_EXTENSIONS.has(ext) || (mimeType && isTextMime(mimeType))) {
    const lang = guessLanguageFromExtension(ext) ?? mimeType?.split('/').pop()
    return (
      <div className={`p-4 ${className ?? ''}`}>
        <CodeBlockContent url={url} fileName={fileName} language={lang} />
      </div>
    )
  }

  return (
    <div className={className}>
      <NoPreview fileName={fileName} />
    </div>
  )
}

function MarkdownPreviewContent({ url, fileName }: { url: string; fileName: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(); return r.text() })
      .then((text) => { if (!cancelled) setContent(text) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [url])

  if (error) return <MarkdownPreview content={`Failed to load ${fileName}`} />
  if (content === null) return <MarkdownPreview content={`Loading ${fileName}...`} />
  return <MarkdownPreview content={content} />
}

function CodeBlockContent({ url, fileName, language }: { url: string; fileName: string; language?: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(); return r.text() })
      .then((text) => { if (!cancelled) setCode(text) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [url])

  if (error) return <CodeBlock code={`// Failed to load ${fileName}`} language={language} fileName={fileName} />
  if (code === null) return <CodeBlock code={`// Loading ${fileName}...`} language={language} fileName={fileName} />
  return <CodeBlock code={code} language={language} fileName={fileName} />
}

export { ImageViewer, PdfViewer, MarkdownPreview, CodeBlock }
