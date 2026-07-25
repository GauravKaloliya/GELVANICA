import { safeHandle } from './handler-wrapper'
import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { readdir, readFile, writeFile } from 'fs/promises'
import { logger } from '../logger'

export function registerAppHandlers(): void {
  safeHandle('version:info', async () => ({
    app: app.getVersion(),
    electron: process.versions.electron ?? '--',
    chrome: process.versions.chrome ?? '--',
    node: process.versions.node ?? '--',
    platform: process.platform,
    arch: process.arch,
  }))

  safeHandle('app:get-log-dir', async () => join(app.getPath('userData'), 'logs'))

  safeHandle('app:export-logs', async () => {
    const logDir = join(app.getPath('userData'), 'logs')
    const mainWindow = BrowserWindow.getAllWindows()[0] ?? null

    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Logs',
      defaultPath: `gnovium-logs-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    })

    if (result.canceled || !result.filePath) return { exported: false }

    const files = await readdir(logDir)
    const logFiles = files.filter(f => f.endsWith('.log'))

    const entries: string[] = []
    for (const file of logFiles) {
      const content = await readFile(join(logDir, file), 'utf-8')
      entries.push(`=== ${file} ===\n${content}`)
    }

    await writeFile(result.filePath, entries.join('\n\n'), 'utf-8')
    logger.info('AppHandlers', `Exported ${logFiles.length} log files`)
    return { exported: true, path: result.filePath }
  })
}
