import { describe, it, expect } from 'vitest'
import { toSearchParams } from '../query-params'

describe('toSearchParams', () => {
  it('converts simple params to query string', () => {
    const result = toSearchParams({ page: 1, limit: 10 })
    expect(result).toBe('?page=1&limit=10')
  })

  it('returns empty string for empty params', () => {
    expect(toSearchParams({})).toBe('')
  })

  it('escapes dangerous input', () => {
    const result = toSearchParams({ q: '<script>alert(1)</script>' })
    expect(result).toContain('q=')
    expect(result).not.toContain('<script>')
  })

  it('strips keys with unsafe characters', () => {
    const result = toSearchParams({ 'safe-key': 'value', '../../etc': 'bad', normalKey: 'good' })
    expect(result).toContain('safe-key=value')
    expect(result).toContain('normalKey=good')
    expect(result).not.toContain('../../etc')
  })

  it('handles boolean values', () => {
    const result = toSearchParams({ active: true, archived: false })
    expect(result).toContain('active=true')
    expect(result).toContain('archived=false')
  })

  it('handles array values', () => {
    const result = toSearchParams({ tags: ['a', 'b', 'c'] })
    expect(result).toContain('tags=')
  })

  it('handles string values', () => {
    const result = toSearchParams({ query: 'hello world' })
    expect(result).toBe('?query=hello+world')
  })

  it('truncates long values', () => {
    const longValue = 'x'.repeat(2000)
    const result = toSearchParams({ q: longValue })
    expect(result).toBe('')
  })

  it('filters out null and undefined values', () => {
    const result = toSearchParams({ a: 'valid', b: null, c: undefined, d: '' })
    expect(result).toBe('?a=valid')
  })

  it('handles nested objects by coercing to empty string', () => {
    const result = toSearchParams({ nested: { key: 'value' } })
    expect(result).toBe('')
  })
})
