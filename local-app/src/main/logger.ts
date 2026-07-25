import { app } from 'electron'
import { join } from 'path'
import { writeFile, readFile, mkdir, readdir, unlink } from 'fs/promises'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MAX_LOG_FILES = 10
const MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024 // 10MB per file

function formatDate(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

class Logger {
  private minLevel: LogLevel = 'info'
  private logDir: string
  private currentLogFile: string | null = null
  private buffer: LogEntry[] = []
  private flushInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.logDir = join(app.getPath('userData'), 'logs')
  }

  async init(): Promise<void> {
    try {
      await mkdir(this.logDir, { recursive: true })
      await this.rotateIfNeeded()
      this.currentLogFile = join(
        this.logDir,
        `gnovium-${formatDate(new Date())}.log`
      )

      // Flush buffer every 5 seconds
      this.flushInterval = setInterval(() => {
        void this.flush()
      }, 5000)
    } catch {
      // Silent fail — logger is non-critical
    }
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level
  }

  debug(module: string, message: string, data?: unknown): void {
    this.log('debug', module, message, data)
  }

  info(module: string, message: string, data?: unknown): void {
    this.log('info', module, message, data)
  }

  warn(module: string, message: string, data?: unknown): void {
    this.log('warn', module, message, data)
  }

  error(module: string, message: string, data?: unknown): void {
    this.log('error', module, message, data)
  }

  private serializeData(data: unknown): string {
    if (data === undefined || data === null) return ''
    if (data instanceof Error) {
      return ` ${JSON.stringify({ message: data.message, stack: data.stack, name: data.name })}`
    }
    return ` ${JSON.stringify(data)}`
  }

  private log(level: LogLevel, module: string, message: string, data?: unknown): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    }

    this.buffer.push(entry)

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}]`
      const suffix = this.serializeData(data)
      if (level === 'error') {
        console.error(`${prefix} ${message}${suffix}`)
      } else {
        console.log(`${prefix} ${message}${suffix}`)
      }
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.currentLogFile) return

    const entries = this.buffer.splice(0)
    const lines = entries.map((e) => {
      let dataStr = ''
      if (e.data !== undefined && e.data !== null) {
        if (e.data instanceof Error) {
          dataStr = ` | ${JSON.stringify({ message: e.data.message, stack: e.data.stack, name: e.data.name })}`
        } else {
          dataStr = ` | ${JSON.stringify(e.data)}`
        }
      }
      return `${e.timestamp} [${e.level.toUpperCase().padEnd(5)}] [${e.module}] ${e.message}${dataStr}`
    })

    try {
      await writeFile(this.currentLogFile, lines.join('\n') + '\n', { flag: 'a' })
      await this.rotateIfNeeded()
    } catch {
      // Silent fail — re-queue entries
      this.buffer.unshift(...entries)
    }
  }

  private async rotateIfNeeded(): Promise<void> {
    if (!this.currentLogFile) return

    try {
      const stats = await readFile(this.currentLogFile, 'utf-8').catch(() => '')
      if (stats.length > MAX_LOG_SIZE_BYTES) {
        const timestamp = formatDate(new Date())
        this.currentLogFile = join(this.logDir, `gnovium-${timestamp}.log`)
        await this.cleanupOldLogs()
      }
    } catch {
      // Ignore
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await readdir(this.logDir)
      const logFiles = files
        .filter((f) => f.startsWith('gnovium-') && f.endsWith('.log'))
        .sort()

      while (logFiles.length > MAX_LOG_FILES) {
        const oldest = logFiles.shift()
        if (oldest) {
          await unlink(join(this.logDir, oldest))
        }
      }
    } catch {
      // Ignore
    }
  }

  async destroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    await this.flush()
  }
}

export const logger = new Logger()
