import type { H3Event } from 'h3'
import { createError, getRequestIP, setHeader } from 'h3'
import { createAuthRateLimiter } from '@miraicms/core'

const limiter = createAuthRateLimiter()

export function getAuthAttemptKey(
  event: H3Event,
  action: 'login' | 'register',
  email: string,
): string {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  return `${action}:${ip}:${email.trim().toLowerCase()}`
}

export function assertAuthAttemptAllowed(event: H3Event, key: string): void {
  const decision = limiter.check(key)
  if (!decision.allowed) {
    throwTooManyAttempts(event, decision.retryAfterMs)
  }
}

export function recordAuthAttemptFailure(key: string) {
  return limiter.recordFailure(key)
}

export function recordAuthAttemptSuccess(key: string): void {
  limiter.recordSuccess(key)
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
