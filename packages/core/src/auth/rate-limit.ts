export interface AuthRateLimitOptions {
  /** Consecutive failures allowed before a cooldown starts. Default 3. */
  maxAttempts?: number
  /** Cooldown after hitting `maxAttempts`. Doubles on each extra failure. Default 5s. */
  delayMs?: number
  /** Upper bound on the cooldown. Default 30s. */
  maxDelayMs?: number
  /** Inactivity window after which the failure count resets. Default 15 minutes. */
  windowMs?: number
  now?: () => number
}

export interface AuthRateLimitDecision {
  allowed: boolean
  retryAfterMs: number
}

export interface AuthRateLimiter {
  check(key: string): AuthRateLimitDecision
  recordFailure(key: string): AuthRateLimitDecision
  recordSuccess(key: string): void
}

interface Entry {
  failures: number
  blockedUntil: number
  lastFailureAt: number
}

export const DEFAULT_AUTH_RATE_LIMIT = {
  maxAttempts: 3,
  delayMs: 5_000,
  maxDelayMs: 30_000,
  windowMs: 15 * 60 * 1000,
} as const

/**
 * In-memory failed-attempt limiter for login/register.
 *
 * After {@link DEFAULT_AUTH_RATE_LIMIT.maxAttempts} consecutive failures the
 * next try is delayed by a few seconds (doubling up to `maxDelayMs`). Counts
 * reset on success or after `windowMs` of inactivity.
 */
export function createAuthRateLimiter(options: AuthRateLimitOptions = {}): AuthRateLimiter {
  const maxAttempts = options.maxAttempts ?? DEFAULT_AUTH_RATE_LIMIT.maxAttempts
  const delayMs = options.delayMs ?? DEFAULT_AUTH_RATE_LIMIT.delayMs
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_AUTH_RATE_LIMIT.maxDelayMs
  const windowMs = options.windowMs ?? DEFAULT_AUTH_RATE_LIMIT.windowMs
  const now = options.now ?? Date.now
  const store = new Map<string, Entry>()

  function prune(t: number) {
    if (store.size < 64) {
      return
    }
    for (const [key, entry] of store) {
      if (entry.blockedUntil <= t && t - entry.lastFailureAt >= windowMs) {
        store.delete(key)
      }
    }
  }

  function getFresh(key: string, t: number): Entry | undefined {
    const entry = store.get(key)
    if (!entry) {
      return undefined
    }
    if (entry.blockedUntil <= t && t - entry.lastFailureAt >= windowMs) {
      store.delete(key)
      return undefined
    }
    return entry
  }

  function check(key: string): AuthRateLimitDecision {
    const t = now()
    prune(t)
    const entry = getFresh(key, t)
    if (!entry) {
      return { allowed: true, retryAfterMs: 0 }
    }
    const retryAfterMs = entry.blockedUntil - t
    if (retryAfterMs > 0) {
      return { allowed: false, retryAfterMs }
    }
    return { allowed: true, retryAfterMs: 0 }
  }

  function recordFailure(key: string): AuthRateLimitDecision {
    const t = now()
    const existing = getFresh(key, t)
    const entry: Entry = existing ?? { failures: 0, blockedUntil: 0, lastFailureAt: t }
    entry.failures += 1
    entry.lastFailureAt = t
    if (entry.failures >= maxAttempts) {
      const extra = entry.failures - maxAttempts
      const delay = Math.min(maxDelayMs, delayMs * (2 ** extra))
      entry.blockedUntil = t + delay
    }
    store.set(key, entry)
    const retryAfterMs = Math.max(0, entry.blockedUntil - t)
    return {
      allowed: retryAfterMs <= 0,
      retryAfterMs,
    }
  }

  function recordSuccess(key: string): void {
    store.delete(key)
  }

  return { check, recordFailure, recordSuccess }
}
