export interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  pages: number
}

export interface ApiError {
  error: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
  }
}

export type ErrorCode =
  | 'not_found'
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'bad_request'
  | 'rate_limit_exceeded'
  | 'internal_error'

export interface PaginationParams {
  page?: number
  per_page?: number
}
