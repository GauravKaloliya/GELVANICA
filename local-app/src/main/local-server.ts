import { spawn, ChildProcess } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import net from 'net'
import { existsSync } from 'fs'
import { logger } from './logger'
import { env } from '@main/env'

const isDev = !app.isPackaged

const FLASK_PORT = env.FLASK_PORT
const HEALTH_CHECK_INTERVAL_MS = 1000
const HEALTH_CHECK_MAX_RETRIES = 30
const MAX_RESTART_ATTEMPTS = 5
const RESTART_DELAY_MS = 3000

function getBackendPath(): string {
  if (isDev) {
    return join(__dirname, '../../../backend')
  }
  return join(process.resourcesPath, 'backend')
}

function getPythonCommand(): string {
  const backendPath = getBackendPath()
  const venvPython = join(backendPath, '.venv', 'bin', 'python')
  if (existsSync(venvPython)) return venvPython

  const venvPythonWin = join(backendPath, '.venv', 'Scripts', 'python.exe')
  if (existsSync(venvPythonWin)) return venvPythonWin

  return 'python3'
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.listen(port, '127.0.0.1')
  })
}

export class LocalServer {
  private process: ChildProcess | null = null
  private restartAttempts = 0
  private restarting = false
  private stderrBuffer: string[] = []
  private lastExitCode: number | null = null
  private lastExitSignal: string | null = null

  get isRunning(): boolean {
    return this.process !== null && this.process.exitCode === null
  }

  async start(): Promise<void> {
    const portAvailable = await isPortAvailable(FLASK_PORT)
    if (!portAvailable) {
      logger.warn('LocalServer', `Port ${FLASK_PORT} is in use, Flask may already be running`)
      const healthy = await this.healthCheck()
      if (healthy) {
        logger.info('LocalServer', 'Existing Flask instance is healthy')
        return
      }
      throw new Error(`Port ${FLASK_PORT} is occupied and backend is not responding`)
    }

    this.spawnFlask()

    const healthy = await this.healthCheck()
    if (!healthy) {
      throw new Error('LocalServer: Flask backend failed health check after startup')
    }

    logger.info('LocalServer', 'Flask backend started successfully')
  }

  kill(): void {
    if (this.process && this.process.exitCode === null) {
      logger.info('LocalServer', 'Stopping Flask backend', { pid: this.process.pid })

      this.process.removeAllListeners()

      if (process.platform !== 'win32') {
        this.process.kill('SIGTERM')
      } else {
        this.process.kill()
      }

      const killTimeout = setTimeout(() => {
        if (this.process && this.process.exitCode === null) {
          logger.warn('LocalServer', 'Force killing Flask backend')
          this.process.kill('SIGKILL')
        }
      }, 5000)

      this.process.on('exit', () => {
        clearTimeout(killTimeout)
      })
    }
  }

  getProcessInfo(): { pid: number | undefined; running: boolean; lastExitCode: number | null; lastExitSignal: string | null; recentErrors: string[] } {
    return {
      pid: this.process?.pid,
      running: this.isRunning,
      lastExitCode: this.lastExitCode,
      lastExitSignal: this.lastExitSignal,
      recentErrors: this.stderrBuffer.slice(-10),
    }
  }

  private spawnFlask(): void {
    const python = getPythonCommand()
    const backendPath = getBackendPath()

    const env = {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      FLASK_PORT: String(FLASK_PORT),
      FLASK_ENV: isDev ? 'development' : 'production',
    }

    logger.info('LocalServer', 'Spawning Flask', { command: python, cwd: backendPath })

    this.process = spawn(python, ['-m', 'flask', 'run', '--port', String(FLASK_PORT)], {
      cwd: backendPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    this.process.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) logger.info('LocalServer', line, { source: 'stdout' })
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (!line) return
      this.stderrBuffer.push(`[${new Date().toISOString()}] ${line}`)
      if (this.stderrBuffer.length > 100) this.stderrBuffer.shift()
      logger.error('LocalServer', line, { source: 'stderr' })
    })

    this.process.on('exit', (code, signal) => {
      this.lastExitCode = code
      this.lastExitSignal = signal
      logger.warn('LocalServer', `Flask exited with code ${code}, signal ${signal}`)
      this.process = null

      if (!this.restarting) {
        this.attemptRestart()
      }
    })

    this.process.on('error', (error) => {
      logger.error('LocalServer', 'Flask spawn error', error)
      this.process = null
      this.attemptRestart()
    })
  }

  private async attemptRestart(): Promise<void> {
    if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      logger.error('LocalServer', 'Max restart attempts reached, giving up')
      return
    }

    this.restarting = true
    this.restartAttempts++
    logger.info('LocalServer', `Restarting in ${RESTART_DELAY_MS}ms`, {
      attempt: this.restartAttempts,
      max: MAX_RESTART_ATTEMPTS,
    })

    await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS))

    this.restarting = false

    try {
      await this.start()
    } catch (error) {
      this.restarting = false
      logger.error('LocalServer', 'Restart failed', error)
    }
  }

  private async healthCheck(): Promise<boolean> {
    for (let i = 0; i < HEALTH_CHECK_MAX_RETRIES; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${FLASK_PORT}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        })

        if (response.ok) {
          return true
        }
      } catch {
        // Not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS))
    }

    return false
  }
}
