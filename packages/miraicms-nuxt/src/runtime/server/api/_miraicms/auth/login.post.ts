import { createError, defineEventHandler, readBody } from 'h3'
import {
  MAX_PASSWORD_LENGTH,
  findUserByEmail,
  toSafeUser,
  verifyPassword,
} from '@miraicms/core'
import type { SafeUser } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { setUserSession } from '../../../utils/session'
import {
  assertAuthAttemptAllowed,
  getAuthAttemptKeys,
  invalidCredentialsError,
  recordAuthAttemptFailure,
  recordAuthAttemptSuccess,
} from '../../../utils/auth-rate-limit'

interface LoginBody {
  email?: unknown
  password?: unknown
}

export default defineEventHandler(async (event): Promise<{ user: SafeUser }> => {
  const body = await readBody<LoginBody>(event)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    throw createError({ statusCode: 422, statusMessage: 'Unprocessable Entity', message: 'Enter email and password.' })
  }

  const attemptKeys = getAuthAttemptKeys(event, 'login', email)
  assertAuthAttemptAllowed(event, attemptKeys)

  // Same generic error for "no such user", "banned" and "wrong password" so the
  // endpoint doesn't reveal which emails are registered.
  function fail(): never {
    const { retryAfterMs } = recordAuthAttemptFailure(attemptKeys)
    throw invalidCredentialsError(retryAfterMs)
  }

  // An over-long password can never match a stored hash; reject before scrypt
  // so it can't be abused as a CPU-bound denial-of-service vector.
  if (password.length > MAX_PASSWORD_LENGTH) {
    fail()
  }

  const user = await findUserByEmail(getDb(), email)
  if (!user || user.status === 'banned') {
    fail()
  }

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) {
    fail()
  }

  recordAuthAttemptSuccess(attemptKeys)
  await setUserSession(event, user.id, user.session_version)
  return { user: toSafeUser(user) }
})
