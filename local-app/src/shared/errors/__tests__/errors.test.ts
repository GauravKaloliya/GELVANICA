import { describe, it, expect } from 'vitest'
import { IpcError, ValidationError, AuthError, FlaskError, NotFoundError, RateLimitError } from '../../errors'

describe('Error types', () => {
  describe('IpcError', () => {
    it('creates error with code and message', () => {
      const err = new IpcError('TEST_ERROR', 'something failed')
      expect(err.code).toBe('TEST_ERROR')
      expect(err.message).toBe('something failed')
      expect(err).toBeInstanceOf(Error)
    })

    it('accepts details', () => {
      const err = new IpcError('TEST', 'msg', { key: 'value' })
      expect(err.details).toEqual({ key: 'value' })
    })
  })

  describe('ValidationError', () => {
    it('creates error with field and reason', () => {
      const err = new ValidationError('email', 'must be valid')
      expect(err.code).toBe('VALIDATION_ERROR')
      expect(err.message).toContain('email')
      expect(err.message).toContain('must be valid')
    })
  })

  describe('AuthError', () => {
    it('creates error with message', () => {
      const err = new AuthError('Token expired')
      expect(err.code).toBe('AUTH_ERROR')
      expect(err.message).toBe('Token expired')
    })
  })

  describe('FlaskError', () => {
    it('creates error with status code', () => {
      const err = new FlaskError(404, 'Not found')
      expect(err.code).toBe('FLASK_ERROR')
      expect(err.details).toEqual({ status: 404 })
    })
  })

  describe('NotFoundError', () => {
    it('creates error with resource type', () => {
      const err = new NotFoundError('Entity')
      expect(err.code).toBe('NOT_FOUND')
      expect(err.message).toContain('Entity')
    })

    it('includes id when provided', () => {
      const err = new NotFoundError('Entity', '123')
      expect(err.message).toContain('123')
    })
  })

  describe('RateLimitError', () => {
    it('creates error with channel name', () => {
      const err = new RateLimitError('test:channel')
      expect(err.code).toBe('RATE_LIMIT')
      expect(err.message).toContain('test:channel')
    })
  })
})
