import { safeInvoke } from '../safe-ipc'
import type { FileInfo } from '../types'

export const filesystemAPI = {
  readFile: (path: string): Promise<string> =>
    safeInvoke('filesystem:read-file', path) as Promise<string>,

  writeFile: (path: string, data: string): Promise<void> =>
    safeInvoke('filesystem:write-file', path, data) as Promise<void>,

  listDir: (path: string): Promise<FileInfo[]> =>
    safeInvoke('filesystem:list-dir', path) as Promise<FileInfo[]>,

  deleteFile: (path: string): Promise<void> =>
    safeInvoke('filesystem:delete-file', path) as Promise<void>,
}
