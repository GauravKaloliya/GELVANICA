import { describe, it, expect } from 'vitest'
import { requireUuid, requireString, requireNumber, sanitizeInput, requireSafeFilename, requireMaxDepth } from '../validate'

describe('requireUuid', () => {
  it('rejects invalid UUIDs', () => {
    expect(() => requireUuid('not-a-uuid')).toThrow()
    expect(() => requireUuid('')).toThrow()
    expect(() => requireUuid(undefined as unknown as string)).toThrow()
  })

  it('accepts valid UUIDs', () => {
    expect(requireUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    )
  })

  it('rejects non-v4 UUIDs', () => {
    expect(() => requireUuid('550e8400-e29b-31d4-a716-446655440000')).toThrow()
  })
})

describe('requireString', () => {
  it('rejects non-strings', () => {
    expect(() => requireString(123 as unknown as string, 'field')).toThrow()
    expect(() => requireString(undefined as unknown as string, 'field')).toThrow()
  })

  it('rejects empty strings', () => {
    expect(() => requireString('', 'field')).toThrow()
    expect(() => requireString('   ', 'field')).toThrow()
  })

  it('enforces min length', () => {
    expect(() => requireString('ab', 'field', { minLength: 3 })).toThrow()
    expect(requireString('abc', 'field', { minLength: 3 })).toBe('abc')
  })

  it('enforces max length', () => {
    expect(() => requireString('toolong', 'field', { maxLength: 3 })).toThrow()
    expect(requireString('ok', 'field', { maxLength: 3 })).toBe('ok')
  })
})

describe('requireNumber', () => {
  it('rejects non-numbers', () => {
    expect(() => requireNumber(NaN, 'field')).toThrow()
  })

  it('enforces min', () => {
    expect(() => requireNumber(-1, 'field', 0)).toThrow()
    expect(requireNumber(0, 'field', 0)).toBe(0)
  })

  it('enforces max', () => {
    expect(() => requireNumber(11, 'field', 0, 10)).toThrow()
    expect(requireNumber(10, 'field', 0, 10)).toBe(10)
  })

  it('converts string numbers', () => {
    expect(requireNumber('42', 'field')).toBe(42)
  })
})

describe('sanitizeInput', () => {
  it('strips HTML tags', () => {
    expect(sanitizeInput('<b>bold</b>')).toBe('bold')
  })

  it('strips javascript protocol', () => {
    expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)')
  })

  it('strips event handlers', () => {
    expect(sanitizeInput('onclick=alert(1)')).toBe('alert(1)')
  })

  it('strips null bytes', () => {
    expect(sanitizeInput('hello\x00world')).toBe('helloworld')
  })

  it('enforces max length', () => {
    const long = 'x'.repeat(20000)
    expect(sanitizeInput(long)).toHaveLength(10000)
  })

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })
})

describe('requireSafeFilename', () => {
  it('accepts valid filenames', () => {
    expect(requireSafeFilename('document.pdf')).toBe('document.pdf')
    expect(requireSafeFilename('my-file_v2.txt')).toBe('my-file_v2.txt')
  })

  it('rejects path traversal', () => {
    expect(() => requireSafeFilename('../etc/passwd')).toThrow()
    expect(() => requireSafeFilename('..\\windows\\system32')).toThrow()
  })

  it('rejects absolute paths', () => {
    expect(() => requireSafeFilename('/etc/passwd')).toThrow()
  })

  it('rejects empty filenames', () => {
    expect(() => requireSafeFilename('')).toThrow()
  })
})

describe('requireMaxDepth', () => {
  it('accepts valid depths', () => {
    expect(requireMaxDepth(0)).toBe(0)
    expect(requireMaxDepth(5)).toBe(5)
  })

  it('rejects negative depths', () => {
    expect(() => requireMaxDepth(-1)).toThrow()
  })

  it('rejects depths exceeding max', () => {
    expect(() => requireMaxDepth(15, 10)).toThrow()
  })

  it('converts string numbers', () => {
    expect(requireMaxDepth('3')).toBe(3)
  })
})
