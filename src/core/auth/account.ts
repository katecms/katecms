/**
 * Email format check. Domain labels exclude '.' so segments can't overlap with
 * the literal dot, keeping the match linear (no catastrophic backtracking).
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

/** Minimum accepted password length. */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Upper bound on accepted password length. scrypt is intentionally expensive,
 * so an unbounded input is a cheap denial-of-service vector; cap it generously
 * (well above any real password) before hashing/verifying.
 */
export const MAX_PASSWORD_LENGTH = 1024

export type ValidationSuccess = { ok: true }
export type ValidationFailure = { ok: false, error: string }
export type ValidationResult = ValidationSuccess | ValidationFailure

/** Whether `email` looks like a valid address. */
export function validateEmail(email: string): ValidationResult {
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Enter a valid email.' }
  }
  return { ok: true }
}

/** Whether `password` is within the accepted length bounds. */
export function validatePassword(password: string): ValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    }
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`,
    }
  }
  return { ok: true }
}
