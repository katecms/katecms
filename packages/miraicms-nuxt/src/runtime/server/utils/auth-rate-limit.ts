import type { H3Event } from 'h3'
import { createError, setHeader } from 'h3'
import {
  authAttemptKeys,
  authAttemptRetryAfterMs,
  recordAuthAttemptFailure,
  recordAuthAttemptSuccess,
} from './auth-attempts'
import type { AuthAttemptKeys } from './auth-attempts'
import { eventClientAddress } from './request-address'

export { authAttemptKeys, recordAuthAttemptFailure, recordAuthAttemptSuccess }
export type { AuthAttemptKeys }

export function getAuthAttemptKeys(
  event: H3Event,
  action: 'login' | 'register',
  email: string,
): AuthAttemptKeys {
  return authAttemptKeys(action, eventClientAddress(event), email)
}

export function assertAuthAttemptAllowed(event: H3Event, key: string | AuthAttemptKeys): void {
  const retryAfterMs = authAttemptRetryAfterMs(key)
  if (retryAfterMs > 0) {
    throwTooManyAttempts(event, retryAfterMs)
  }
}

export function throwTooManyAttempts(event: H3Event, retryAfterMs: number): never {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000))
  setHeader(event, 'Retry-After', retryAfterSec)
  throw createError({
    statusCode: 429,
    statusMessage: 'Too Many Requests',
    message: `Too many attempts. Try again in ${retryAfterSec} sec.`,
    data: { retryAfterMs },
  })
}

export function invalidCredentialsError(retryAfterMs = 0) {
  return createError({
    statusCode: 401,
    statusMessage: 'Unauthorized',
    message: 'Invalid email or password.',
    data: { retryAfterMs },
  })
}
