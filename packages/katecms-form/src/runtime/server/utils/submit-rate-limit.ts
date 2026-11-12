import type { H3Event } from 'h3'
import { createError, setHeader } from 'h3'
import { createWindowRateLimiter } from '@katecms/core'
import { eventClientAddress } from 'katecms/server'

/** Submissions accepted from one address inside {@link SUBMIT_WINDOW_MS}. */
const SUBMIT_MAX = 10
const SUBMIT_WINDOW_MS = 10 * 60 * 1000
const ADDRESS_MAX = 80

const limiter = createWindowRateLimiter({
  max: SUBMIT_MAX,
  windowMs: SUBMIT_WINDOW_MS,
})

/**
 * Address stored on a submission and used as the rate-limit bucket.
 * The forwarded header counts only when `MIRAICMS_TRUST_PROXY` is set.
 */
export function formSubmissionAddress(event: H3Event): string {
  return eventClientAddress(event).slice(0, ADDRESS_MAX)
}

/**
 * Consume one submit slot after the body has been validated and before mail or insert.
 * Returns the address to store.
 */
export function takeFormSubmission(event: H3Event): string {
  const address = formSubmissionAddress(event) || 'unknown'
  const decision = limiter.consume(`submit:${address}`)
  if (!decision.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil(decision.retryAfterMs / 1000))
    setHeader(event, 'Retry-After', retryAfterSec)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Too many submissions. Try again in ${retryAfterSec} sec.`,
      data: { retryAfterMs: decision.retryAfterMs },
    })
  }
  return address
}
