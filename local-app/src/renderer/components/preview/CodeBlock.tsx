import { useState, useCallback, useMemo } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  fileName?: string
  showLineNumbers?: boolean
  maxHeight?: number
  className?: string
}

const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  py: 'Python',
  rb: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  c: 'C',
  cpp: 'C++',
  cs: 'C#',
  php: 'PHP',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Zsh',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  md: 'Markdown',
  graphql: 'GraphQL',
  tf: 'Terraform',
  hcl: 'HCL',
  vue: 'Vue',
  svelte: 'Svelte',
}

const KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'switch', 'case', 'break', 'continue', 'do', 'in', 'of', 'yield', 'delete', 'void', 'null', 'undefined', 'true', 'false'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'switch', 'case', 'break', 'continue', 'interface', 'type', 'enum', 'namespace', 'declare', 'abstract', 'implements', 'readonly', 'private', 'protected', 'public', 'static', 'as', 'keyof', 'infer', 'null', 'undefined', 'true', 'false', 'void', 'never', 'unknown', 'any'],
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'yield', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'self', 'print'],
  go: ['func', 'package', 'import', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'type', 'struct', 'interface', 'map', 'chan', 'go', 'select', 'defer', 'var', 'const', 'nil', 'true', 'false'],
  rust: ['fn', 'let', 'mut', 'pub', 'use', 'mod', 'struct', 'enum', 'impl', 'trait', 'match', 'if', 'else', 'for', 'while', 'loop', 'return', 'self', 'Self', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'async', 'await', 'move', 'ref', 'where', 'type', 'const', 'static'],
}

function getLanguageLang(language?: string): string {
  if (!language) return 'text'
  const lang = language.toLowerCase()
  if (['js', 'jsx'].includes(lang)) return 'javascript'
  if (['ts', 'tsx'].includes(lang)) return 'typescript'
  if (['py'].includes(lang)) return 'python'
  if (['rb'].includes(lang)) return 'ruby'
  if (['sh', 'bash', 'zsh'].includes(lang)) return 'bash'
  if (['yml'].includes(lang)) return 'yaml'
  return lang
}

function highlightLine(line: string, lang: string): string {
  const keywords = KEYWORDS[lang] ?? KEYWORDS[getLanguageLang(lang)] ?? []
  if (keywords.length === 0) return line.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  let result = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  result = result.replace(/(["'`])(?:(?!\1|\\).|\\.)*\1/g, (m) => `<span class="text-emerald-400">${m}</span>`)
  result = result.replace(/(\/\/.*$|#.*$)/gm, (m) => `<span class="text-muted-foreground italic">${m}</span>`)

  for (const kw of keywords) {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g')
    result = result.replace(regex, '<span class="text-violet-400">$1</span>')
  }

  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>')

  return result
}

export function CodeBlock({
  code,
  language,
  fileName,
  showLineNumbers = true,
  maxHeight = 500,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleDownload = useCallback(() => {
    const ext = language ? `.${language}` : '.txt'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (fileName || 'code') + ext
    a.click()
    URL.revokeObjectURL(url)
  }, [code, language, fileName])

  const lang = getLanguageLang(language)
  const lines = code.split('\n')
  const langLabel = LANGUAGE_LABELS[language?.toLowerCase() ?? ''] ?? language?.toUpperCase() ?? 'TEXT'

  const highlightedLines = useMemo(
    () => lines.map((line) => highlightLine(line, lang)),
    [lines, lang]
  )

  return (
    <div className={cn('group relative overflow-hidden rounded-lg border bg-[#0d1117] font-mono', className)}>
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <div className="flex items-center gap-2">
          {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
          {language && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {langLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {highlightedLines.map((line, i) => (
              <tr key={i} className="hover:bg-white/5">
                {showLineNumbers && (
                  <td className="select-none border-r border-white/10 py-0 pr-4 pl-4 text-right text-muted-foreground/50">
                    {i + 1}
                  </td>
                )}
                <td className="whitespace-pre py-0 pr-4 pl-4">
                  <span dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
