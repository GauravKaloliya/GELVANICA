import { safeHandle } from './handler-wrapper'
import { readFile, writeFile, readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'
import { safePath } from './flask-client'
import { requireSafeFilename } from './validate'
import { logger } from '../logger'

export function registerFilesystemHandlers(): void {
  safeHandle('filesystem:read-file', async (_event, filePath: string) => {
    const safe = safePath(filePath)
    const buffer = await readFile(safe)
    return buffer.toString('base64')
  })

  safeHandle('filesystem:write-file', async (_event, filePath: string, data: string) => {
    const safe = safePath(filePath)
    const fileName = safe.split(/[/\\]/).pop() ?? ''
    if (fileName) requireSafeFilename(fileName)
    await writeFile(safe, Buffer.from(data, 'base64'))
  })

  safeHandle('filesystem:list-dir', async (_event, dirPath: string) => {
    const safe = safePath(dirPath)
    const entries = await readdir(safe, { withFileTypes: true })
    const results = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(safe, entry.name)
        const stats = await stat(fullPath).catch(() => null)
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats?.size ?? 0,
          modifiedAt: stats?.mtime?.toISOString() ?? new Date().toISOString(),
        }
      })
    )
    return results
  })

  safeHandle('filesystem:delete-file', async (_event, filePath: string) => {
    const safe = safePath(filePath)
    const fileName = safe.split(/[/\\]/).pop() ?? ''
    if (fileName) requireSafeFilename(fileName)
    await unlink(safe)
    logger.debug('Filesystem', `Deleted file: ${fileName}`)
  })
}
