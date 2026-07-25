import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, User, Sparkles, Trash2, AlertCircle, Lightbulb } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { useStore } from '@/store'
import { api } from '@lib/api'
import { cn } from '@lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED_PROMPTS = [
  'Summarize this workspace',
  'Suggest relations for the active entity',
  'What are the key themes in my knowledge base?',
  'Find connections between recent entities',
  'Generate an overview of this branch',
  'What entities are most referenced?',
]

export default function AIAssistant() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(async (text?: string) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || isLoading || !activeWorkspaceId) return

    setError(null)
    const userMessage: Message = { role: 'user', content: trimmed, timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.ai.query({
        workspace_id: activeWorkspaceId,
        question: trimmed,
      })

      if (!response || !response.answer) {
        const notAvailableMessage: Message = {
          role: 'assistant',
          content: 'The AI assistant is not available yet. This feature will be enabled in a future update. In the meantime, you can use manual search and tagging to organize your knowledge.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, notAvailableMessage])
        setError('AI_NOT_AVAILABLE')
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.answer,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (err: unknown) {
      const is501 =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        (err as { status?: number }).status === 501

      if (is501) {
        setError('AI_NOT_AVAILABLE')
        const notAvailableMessage: Message = {
          role: 'assistant',
          content: 'The AI assistant is not available yet (501 Not Implemented). This feature will be enabled in a future update.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, notAvailableMessage])
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [input, isLoading, activeWorkspaceId])

  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date)

  const hasMessages = messages.length > 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">AI Assistant</h1>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          {error === 'AI_NOT_AVAILABLE' && (
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-600">
              Offline
            </span>
          )}
        </div>
        {hasMessages && (
          <Button variant="ghost" size="sm" onClick={clearHistory} className="h-7 text-xs text-muted-foreground">
            <Trash2 className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
            <EmptyState
              icon={<Sparkles className="h-6 w-6 text-muted-foreground" />}
              title="Ask AI anything about your workspace"
              description="Get summaries, find connections, or generate content from your knowledge base."
            />
            <div className="w-full max-w-lg space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
                <span>Try asking</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={!activeWorkspaceId}
                    className="rounded-lg border px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full px-4">
            <div className="space-y-4 py-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={`${msg.timestamp.getTime()}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p
                        className={cn(
                          'mt-1.5 text-[10px]',
                          msg.role === 'user'
                            ? 'text-primary-foreground/60'
                            : 'text-muted-foreground',
                        )}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3.5 py-2.5">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Unavailable banner */}
      {error === 'AI_NOT_AVAILABLE' && (
        <div className="border-t bg-yellow-500/5 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-yellow-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>AI is not available in this environment. You can still browse your knowledge base manually.</span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t px-4 py-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={error === 'AI_NOT_AVAILABLE' ? 'AI is offline — send anyway...' : 'Ask a question...'}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading || !activeWorkspaceId}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
