import { createAuthRateLimiter } from '@miraicms/core'
import type { AuthRateLimitDecision } from '@miraicms/core'

const limiter = createAuthRateLimiter()

export interface AuthAttemptKeys {
  /** Action, address, and email. Cleared after a successful attempt. */
  pair: string
  /** Action and address. Stays after success so one login does not reopen the address. */
  ip: string
  /** Action and email. Cleared after a successful attempt. */
  email: string
}

/**
 * Three buckets for one login or registration attempt.
 * Empty addresses and emails share an `unknown` bucket.
 */
export function authAttemptKeys(
  action: 'login' | 'register',
  ip: string,
  email: string,
): AuthAttemptKeys {
  const address = ip.trim() || 'unknown'
  const normalized = email.trim().toLowerCase() || 'unknown'
  return {
    pair: `${action}:pair:${address}:${normalized}`,
    ip: `${action}:ip:${address}`,
    email: `${action}:email:${normalized}`,
  }
}

function asKeys(key: string | AuthAttemptKeys): string[] {
  return typeof key === 'string' ? [key] : [key.pair, key.ip, key.email]
}

/** Longest cooldown among the given buckets, or 0 when every bucket allows the attempt. */
export function authAttemptRetryAfterMs(key: string | AuthAttemptKeys): number {
  let retryAfterMs = 0
  for (const item of asKeys(key)) {
    const decision = limiter.check(item)
    if (!decision.allowed) {
      retryAfterMs = Math.max(retryAfterMs, decision.retryAfterMs)
    }
  }
  return retryAfterMs
}

export function recordAuthAttemptFailure(key: string | AuthAttemptKeys): AuthRateLimitDecision {
  let longest: AuthRateLimitDecision = { allowed: true, retryAfterMs: 0 }
  for (const item of asKeys(key)) {
    const decision = limiter.recordFailure(item)
    if (decision.retryAfterMs > longest.retryAfterMs) {
      longest = decision
    }
  }
  return longest
}

/**
 * Drop the email and pair buckets. An address bucket is left in place.
 * A string key (password change) is cleared on its own.
 */
export function recordAuthAttemptSuccess(key: string | AuthAttemptKeys): void {
  if (typeof key === 'string') {
    limiter.recordSuccess(key)
    return
  }
  limiter.recordSuccess(key.pair)
  limiter.recordSuccess(key.email)
}
