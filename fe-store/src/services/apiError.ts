export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.length > 0) return error
  if (error instanceof Error && error.message.length > 0) return error.message
  return fallback
}
