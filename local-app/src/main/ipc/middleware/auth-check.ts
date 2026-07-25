import { AuthError } from '../../../shared/errors'
import type { Middleware } from './types'

const PUBLIC_CHANNELS = new Set([
  'auth:open-webview', 'auth:exchange-code', 'auth:is-online',
  'version:info', 'app:get-log-dir',
])

export function authCheckMiddleware(getTokens: () => { access_token?: string } | null): Middleware {
  return async (ctx, next) => {
    if (PUBLIC_CHANNELS.has(ctx.channel)) {
      return next()
    }

    if (ctx.channel.startsWith('auth:') || ctx.channel.startsWith('settings:')) {
      return next()
    }

    const tokens = getTokens()
    if (!tokens?.access_token) {
      throw new AuthError('Authentication required')
    }

    return next()
  }
}
