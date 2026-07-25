import { crashReporter, app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { logger } from './logger'

const MAX_CRASH_DIRS = 20

function getCrashDumpsDir(): string {
  return join(app.getPath('userData'), 'crash-dumps')
}

function cleanupOldCrashDumps(): void {
  const dir = getCrashDumpsDir()
  if (!existsSync(dir)) return

  try {
    const entries = readdirSync(dir)
      .filter((name) => name.startsWith('crash-'))
      .sort()
      .reverse()

    if (entries.length > MAX_CRASH_DIRS) {
      for (const entry of entries.slice(MAX_CRASH_DIRS)) {
        try {
          unlinkSync(join(dir, entry))
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  } catch {
    // Ignore read errors
  }
}

export class CrashReporter {
  constructor() {
    this.init()
  }

  private init(): void {
    const crashesDir = getCrashDumpsDir()
    if (!existsSync(crashesDir)) {
      mkdirSync(crashesDir, { recursive: true })
    }

    cleanupOldCrashDumps()

    crashReporter.start({
      companyName: 'GNOVIUM',
      productName: 'GNOVIUM',
      submitURL: '',
      uploadToServer: false,
      compress: true,
      extra: {
        appVersion: app.getVersion(),
        electronVersion: process.versions.electron ?? 'unknown',
        chromeVersion: process.versions.chrome ?? 'unknown',
        platform: process.platform,
        arch: process.arch,
      },
    })

    process.on('uncaughtException', (error) => {
      logger.error('CrashReporter', 'Uncaught exception', error)
    })

    process.on('unhandledRejection', (reason) => {
      logger.error('CrashReporter', 'Unhandled promise rejection', reason)
    })

    logger.info('CrashReporter', 'Initialized', { crashDumpsDir: crashesDir })
  }

  static getLatestCrashReport(): string | null {
    const dir = getCrashDumpsDir()
    if (!existsSync(dir)) return null

    try {
      const entries = readdirSync(dir)
        .filter((name) => name.endsWith('.dmp'))
        .sort()
        .reverse()

      return entries[0] ? join(dir, entries[0]) : null
    } catch {
      return null
    }
  }

  static getCrashDumpsDir(): string {
    return getCrashDumpsDir()
  }
}
