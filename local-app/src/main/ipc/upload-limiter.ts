import { logger } from '../logger'

const MAX_CONCURRENT_UPLOADS = 10
const activeUploads = new Map<string, boolean>()

export function acquireUploadSlot(fileId: string): boolean {
  if (activeUploads.size >= MAX_CONCURRENT_UPLOADS) {
    logger.warn('UploadLimiter', `Max concurrent uploads reached (${MAX_CONCURRENT_UPLOADS})`)
    return false
  }
  activeUploads.set(fileId, true)
  return true
}

export function releaseUploadSlot(fileId: string): void {
  activeUploads.delete(fileId)
}

export function getActiveUploadCount(): number {
  return activeUploads.size
}
