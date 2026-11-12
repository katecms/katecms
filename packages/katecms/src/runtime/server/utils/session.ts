import type { H3Event } from 'h3'
import { createError, getRequestURL, useSession } from 'h3'
import { findUserById, toSafeUser } from '@katecms/core'
import type { SafeUser } from '@katecms/core'
import { getDb } from './db'

interface SessionData {
  userId?: number
  /** Matches `users.session_version`. Missing cookies count as 0. */
  sessionVersion?: number
}

const SESSION_COOKIE = 'katecms_session'
const MIN_PASSWORD_LENGTH = 32
const SESSION_MAX_AGE = 60 * 60 * 24 * 7
const DEV_FALLBACK = 'katecms-dev-session-password-change-me'

let warnedMissingPassword = false

/**
 * Secret used to seal the session cookie. Required in production
 * (`MIRAICMS_SESSION_PASSWORD`, ≥ 32 chars). Development falls back so the
 * playground works without extra env setup.
 */
function getSessionPassword(): string {
  const password = typeof process.env.MIRAICMS_SESSION_PASSWORD === 'string'
    ? process.env.MIRAICMS_SESSION_PASSWORD
    : ''
  if (password.length >= MIN_PASSWORD_LENGTH) {
    return password
  }
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 500,
      statusMessage: `MIRAICMS_SESSION_PASSWORD must be set to a random string of at least ${MIN_PASSWORD_LENGTH} characters.`,
    })
  }
  if (!warnedMissingPassword) {
    warnedMissingPassword = true
    console.warn(
      `[KateCMS] MIRAICMS_SESSION_PASSWORD is missing or shorter than ${MIN_PASSWORD_LENGTH} characters; using a development fallback. Set it before deploying.`,
    )
  }
  return DEV_FALLBACK
}

function getCmsSession(event: H3Event) {
  return useSession<SessionData>(event, {
    name: SESSION_COOKIE,
    password: getSessionPassword(),
    maxAge: SESSION_MAX_AGE,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: getRequestURL(event).protocol === 'https:',
      sameSite: 'lax',
    },
  })
}

/** Persist the authenticated user's id and password session version. */
export async function setUserSession(
  event: H3Event,
  userId: number,
  sessionVersion = 0,
): Promise<void> {
  const session = await getCmsSession(event)
  await session.update({ userId, sessionVersion })
}

/** Drop the session cookie (logout). */
export async function clearUserSession(event: H3Event): Promise<void> {
  const session = await getCmsSession(event)
  await session.clear()
}

/**
 * Resolve the currently authenticated user from the session cookie.
 *
 * Returns null when there is no session, the referenced user no longer exists,
 * or the account is banned — so callers can treat all of these as "logged out".
 */
export async function getCurrentUser(event: H3Event): Promise<SafeUser | null> {
  const session = await getCmsSession(event)
  const userId = session.data.userId
  if (!userId) {
    return null
  }

  const user = await findUserById(getDb(), userId)
  if (!user || user.status === 'banned') {
    return null
  }
  const sessionVersion = session.data.sessionVersion ?? 0
  if ((user.session_version ?? 0) !== sessionVersion) {
    return null
  }

  return toSafeUser(user)
}

/**
 * Like {@link getCurrentUser} but throws a 401 when there is no authenticated
 * user, so protected handlers can assume a non-null result.
 */
export async function requireUser(event: H3Event): Promise<SafeUser> {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Authentication required.' })
  }
  return user
}
