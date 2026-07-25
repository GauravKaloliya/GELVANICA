import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Send, Sparkles, Copy, Check, RotateCcw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'
import type { AIQueryResponse } from '@shared/types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: AIQueryResponse['sources']
  timestamp: Date
}

function SourceCard({ source }: { source: AIQueryResponse['sources'][0] }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
      <p className="mb-1 font-medium text-foreground truncate">{source.title}</p>
      <p className="line-clamp-3 text-muted-foreground">{source.content}</p>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative',
        message.role === 'assistant' ? 'pl-0' : 'pl-8'
      )}
    >
      {message.role === 'assistant' && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/20">
            <Brain className="h-3 w-3 text-primary" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">AI Assistant</span>
          <span className="text-[10px] text-muted-foreground/60">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div
        className={cn(
          'relative rounded-lg px-3 py-2 text-sm',
          message.role === 'assistant'
            ? 'bg-muted/50'
            : 'bg-primary/10 ml-auto max-w-[85%]'
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

        {message.role === 'assistant' && (
          <button
            onClick={handleCopy}
            className="absolute -right-1 -top-1 rounded border bg-background p-1 opacity-0 shadow-sm group-hover:opacity-100 transition-opacity"
            aria-label={copied ? 'Copied' : 'Copy message'}
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {message.sources && message.sources.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
          </p>
          {message.sources.map((source, i) => (
            <SourceCard key={i} source={source} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function SuggestionChip({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {text}
    </button>
  )
}

export function AIPanel({ entityId }: { entityId: string }) {
  const { query, isQuerying } = useAI()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const suggestions = [
    'Summarize this entity',
    'Suggest related entities',
    'What are the key concepts?',
    'Generate an outline',
  ]

  const handleSend = (text?: string) => {
    const q = text ?? input.trim()
    if (!q || isQuerying) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')

    query(
      { workspace_id: entityId, question: q },
      {
        onSuccess: (result) => {
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: (result as unknown as { data?: AIQueryResponse })?.data?.answer ?? 'I was unable to process that request.',
            sources: (result as unknown as { data?: AIQueryResponse })?.data?.sources,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMsg])
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: 'An error occurred. Make sure the AI service is running.',
              timestamp: new Date(),
            },
          ])
        },
      },
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 p-3">
          {messages.length === 0 && !isQuerying && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="mb-1 text-sm font-medium">AI Assistant</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Ask questions about this entity or get suggestions.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {suggestions.map((s) => (
                  <SuggestionChip key={s} text={s} onClick={() => handleSend(s)} />
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {isQuerying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-0">
              <div className="mb-1.5 flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/20">
                  <Brain className="h-3 w-3 text-primary" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">AI Assistant</span>
              </div>
              <div className="space-y-1.5 rounded-lg bg-muted/50 px-3 py-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            size="sm"
            className="h-[60px] shrink-0 px-3"
            onClick={() => handleSend()}
            disabled={!input.trim() || isQuerying}
          >
            {isQuerying ? (
              <RotateCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
