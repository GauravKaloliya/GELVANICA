export class IpcError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'IpcError'
  }
}

export class ValidationError extends IpcError {
  constructor(field: string, message: string) {
    super('VALIDATION_ERROR', `${field}: ${message}`, { field })
    this.name = 'ValidationError'
  }
}

export class AuthError extends IpcError {
  constructor(message: string) {
    super('AUTH_ERROR', message)
    this.name = 'AuthError'
  }
}

export class FlaskError extends IpcError {
  constructor(status: number, message: string) {
    super('FLASK_ERROR', message, { status })
    this.name = 'FlaskError'
  }
}

export class NotFoundError extends IpcError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', `${resource}${id ? ` ${id}` : ''} not found`)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends IpcError {
  constructor(channel: string) {
    super('RATE_LIMIT', `Rate limit exceeded for channel: ${channel}`)
    this.name = 'RateLimitError'
  }
}

export class PathError extends IpcError {
  constructor(path: string) {
    super('PATH_ERROR', `Path access denied: ${path}`)
    this.name = 'PathError'
  }
}
