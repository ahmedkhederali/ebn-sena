// Shared API envelope types consumed by both frontend and backend

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginationMeta {
  cursor: string | null
  hasMore: boolean
  total?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}
