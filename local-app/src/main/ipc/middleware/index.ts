import type { Middleware } from './types'
import { loggingMiddleware } from './logging'
import { rateLimitMiddleware } from './rate-limit'
import { authCheckMiddleware } from './auth-check'

export type { Middleware, MiddlewareContext } from './types'

export function createDefaultMiddleware(getTokens: () => { access_token?: string } | null): Middleware[] {
  return [
    loggingMiddleware(),
    rateLimitMiddleware(),
    authCheckMiddleware(getTokens),
  ]
}

export function composeMiddleware(middlewares: Middleware[]): (
  ctx: import('./types').MiddlewareContext,
  handler: () => Promise<unknown>,
) => Promise<unknown> {
  return async function runMiddleware(
    ctx: import('./types').MiddlewareContext,
    handler: () => Promise<unknown>,
  ): Promise<unknown> {
    let index = -1

    async function dispatch(i: number): Promise<unknown> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i
      const middleware = middlewares[i]
      if (!middleware) return handler()
      return middleware(ctx, () => dispatch(i + 1))
    }

    return dispatch(0)
  }
}
