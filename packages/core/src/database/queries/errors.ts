export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const err = error as { code?: string, message?: string }
  return err.code === '23505'
    || err.code === 'SQLITE_CONSTRAINT_UNIQUE'
    || err.code === 'SQLITE_CONSTRAINT'
    || /unique/i.test(err.message ?? '')
}
