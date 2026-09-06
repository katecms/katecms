export interface AuthClientError {
  message: string
  retryAfterMs: number
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

/** Pull statusMessage / retryAfterMs out of a `$fetch` / h3 error payload. */
export function parseAuthError(err: unknown, fallback: string): AuthClientError {
  const root = asRecord(err)
  const data = asRecord(root.data)
  const inner = asRecord(data.data)
  const message = [inner.message, data.message, inner.statusMessage, data.statusMessage, root.statusMessage]
    .find((value): value is string => typeof value === 'string' && value.length > 0)
    ?? fallback
  const retryAfterMs = [inner.retryAfterMs, data.retryAfterMs]
    .find((value): value is number => typeof value === 'number' && value > 0)
    ?? 0
  return { message, retryAfterMs }
}
