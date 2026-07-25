import { describe, it, expect } from 'vitest'
import * as constants from '../../shared/constants'

describe('Shared constants', () => {
  it('has valid timeout values', () => {
    expect(constants.FLASK_TIMEOUT_MS).toBeGreaterThan(0)
    expect(constants.SESSION_TIMEOUT_MS).toBeGreaterThan(0)
    expect(constants.HEALTH_CHECK_INTERVAL_MS).toBeGreaterThan(0)
  })

  it('has valid limits', () => {
    expect(constants.MAX_FILE_SIZE_BYTES).toBeGreaterThan(0)
    expect(constants.MAX_CONCURRENT_UPLOADS).toBeGreaterThan(0)
    expect(constants.MAX_ENTITY_DEPTH).toBeGreaterThan(0)
    expect(constants.MAX_ENTITY_TITLE_LENGTH).toBeGreaterThan(0)
  })

  it('has valid regex patterns', () => {
    expect(constants.UUID_V4_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(constants.UUID_V4_REGEX.test('not-a-uuid')).toBe(false)
    expect(constants.AUTH_CODE_REGEX.test('valid_code-123')).toBe(true)
    expect(constants.AUTH_CODE_REGEX.test('')).toBe(false)
  })

  it('has valid crypto constants', () => {
    expect(constants.AES_ALGORITHM).toBe('aes-256-gcm')
    expect(constants.SALT_LENGTH).toBeGreaterThan(0)
    expect(constants.IV_LENGTH).toBeGreaterThan(0)
    expect(constants.KEY_LENGTH).toBe(32)
  })

  it('has valid window dimensions', () => {
    expect(constants.MIN_WINDOW_WIDTH).toBeGreaterThan(0)
    expect(constants.MIN_WINDOW_HEIGHT).toBeGreaterThan(0)
    expect(constants.DEFAULT_WINDOW_WIDTH).toBeGreaterThanOrEqual(constants.MIN_WINDOW_WIDTH)
    expect(constants.DEFAULT_WINDOW_HEIGHT).toBeGreaterThanOrEqual(constants.MIN_WINDOW_HEIGHT)
  })
})
