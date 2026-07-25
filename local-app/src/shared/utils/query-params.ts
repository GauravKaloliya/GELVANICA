const SAFE_PARAM_REGEX = /^[a-zA-Z0-9_-]{0,100}$/

function coerceToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(coerceToString).join(',')
  return ''
}

/**
 * Safely convert a params object to a URL search string.
 * Only allows safe string/number/boolean values. Strips dangerous input.
 */
export function toSearchParams(params: Record<string, unknown>): string {
  const safe = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (!SAFE_PARAM_REGEX.test(key)) continue
    const strValue = coerceToString(value)
    if (strValue.length > 0 && strValue.length <= 1000) {
      safe.set(key, strValue)
    }
  }
  const qs = safe.toString()
  return qs ? `?${qs}` : ''
}
