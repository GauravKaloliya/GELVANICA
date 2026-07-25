import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { logger } from '../logger'
import { IpcError } from '../../shared/errors'
import type { Middleware } from './middleware/types'
import { composeMiddleware } from './middleware'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpcHandler = (...args: any[]) => Promise<any> | any

let composedRunner: ReturnType<typeof composeMiddleware> | null = null

export function setupMiddleware(middlewares: Middleware[]): void {
  composedRunner = composeMiddleware(middlewares)
}

function serializeError(error: unknown): { code: string; message: string; details?: Record<string, unknown> } {
  if (error instanceof IpcError) {
    return { code: error.code, message: error.message, details: error.details }
  }
  if (error instanceof Error) {
    return { code: 'INTERNAL_ERROR', message: error.message }
  }
  return { code: 'UNKNOWN_ERROR', message: String(error) }
}

export function safeHandle(channel: string, handler: IpcHandler): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      if (composedRunner) {
        return await composedRunner(
          { channel, event, args },
          () => handler(event, ...args),
        )
      }
      return await handler(event, ...args)
    } catch (error) {
      const serialized = serializeError(error)
      const level = serialized.code === 'VALIDATION_ERROR' || serialized.code === 'RATE_LIMIT' ? 'warn' : 'error'
      logger[level](`IPC [${channel}]`, serialized.message, serialized.details)
      throw error
    }
  })
}

export function safeOn(channel: string, handler: IpcHandler): void {
  ipcMain.on(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      await handler(event, ...args)
    } catch (error) {
      const serialized = serializeError(error)
      logger.error(`IPC listener [${channel}]`, serialized.message, serialized.details)
    }
  })
}
