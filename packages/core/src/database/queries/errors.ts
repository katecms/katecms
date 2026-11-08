/** Postgres `duplicate key` and SQLite `UNIQUE constraint failed`. */
const UNIQUE_MESSAGE = /unique constraint|duplicate key/i

const NON_UNIQUE_SQLITE = new Set([
  'SQLITE_CONSTRAINT_CHECK',
  'SQLITE_CONSTRAINT_FOREIGNKEY',
  'SQLITE_CONSTRAINT_NOTNULL',
])

export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const err = error as { code?: string, message?: string }
  const code = err.code
  if (code === '23505' || code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true
  }
  if (code && NON_UNIQUE_SQLITE.has(code)) {
    return false
  }
  const uniqueMessage = UNIQUE_MESSAGE.test(err.message ?? '')
  if (code === 'SQLITE_CONSTRAINT') {
    return uniqueMessage
  }
  return !code && uniqueMessage
}
