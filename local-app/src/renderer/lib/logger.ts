type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class RendererLogger {
  private level: LogLevel = 'info'
  private levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

  setLevel(level: LogLevel) {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level]
  }

  private format(logLevel: LogLevel, module: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString()
    const base = `${timestamp} [${logLevel.toUpperCase()}] [${module}] ${message}`
    return data ? `${base} | ${JSON.stringify(data)}` : base
  }

  debug(module: string, message: string, data?: unknown) {
    if (this.shouldLog('debug')) console.debug(this.format('debug', module, message, data))
  }

  info(module: string, message: string, data?: unknown) {
    if (this.shouldLog('info')) console.info(this.format('info', module, message, data))
  }

  warn(module: string, message: string, data?: unknown) {
    if (this.shouldLog('warn')) console.warn(this.format('warn', module, message, data))
  }

  error(module: string, message: string, data?: unknown) {
    if (this.shouldLog('error')) console.error(this.format('error', module, message, data))
  }
}

export const rendererLogger = new RendererLogger()
