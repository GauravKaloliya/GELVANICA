import type { IpcMainInvokeEvent } from 'electron'

export interface MiddlewareContext {
  channel: string
  event: IpcMainInvokeEvent
  args: unknown[]
}

export type Middleware = (ctx: MiddlewareContext, next: () => Promise<unknown>) => Promise<unknown>
