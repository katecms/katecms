import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  OWNER_ROLE,
  SUBSCRIBER_ROLE,
  createUser,
  hasAnyUser,
  hashPassword,
  isUniqueConstraintError,
  toSafeUser,
  validateEmail,
  validatePassword,
} from '@miraicms/core'
import type { SafeUser } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { setUserSession } from '../../../utils/session'
import {
  assertAuthAttemptAllowed,
  getAuthAttemptKey,
  recordAuthAttemptFailure,
  recordAuthAttemptSuccess,
  throwTooManyAttempts,
} from '../../../utils/auth-rate-limit'

interface RegisterBody {
  email?: unknown
  password?: unknown
  passwordConfirm?: unknown
}

/**
 * Self-service registration.
 *
 * The first account ever created becomes `owner` (the protected superuser);
 * every later registration is a `subscriber`. The "is this the first user?"
 * check and the INSERT run inside a single transaction so two concurrent
 * first-time registrations can't both claim ownership.
 *
 * `registration: false` rejects every account after the first. Admin user
 * creation does not use this handler.
 */
export default defineEventHandler(async (event): Promise<{ user: SafeUser }> => {
  const body = await readBody<RegisterBody>(event)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const passwordConfirm = typeof body?.passwordConfirm === 'string' ? body.passwordConfirm : ''

  const attemptKey = getAuthAttemptKey(event, 'register', email || 'unknown')
  assertAuthAttemptAllowed(event, attemptKey)

  const failValidation = (statusMessage: string): never => {
    const { retryAfterMs } = recordAuthAttemptFailure(attemptKey)
    if (retryAfterMs > 0) {
      throwTooManyAttempts(event, retryAfterMs)
    }
    throw createError({ statusCode: 422, statusMessage: 'Unprocessable Entity', message: statusMessage })
  }

  const emailCheck = validateEmail(email)
  if (!emailCheck.ok) {
    failValidation(emailCheck.error)
  }
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.ok) {
    failValidation(passwordCheck.error)
  }
  if (password !== passwordConfirm) {
    failValidation('Passwords do not match.')
  }

  const passwordHash = await hashPassword(password)
  const registrationOpen = useRuntimeConfig().miraicms?.registration === true

  try {
    const user = await getDb().transaction().execute(async (trx) => {
      const isFirstUser = !(await hasAnyUser(trx))
      if (!isFirstUser && !registrationOpen) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden',
          message: 'Registration is disabled.',
        })
      }
      return createUser(trx, {
        email,
        password_hash: passwordHash,
        role: isFirstUser ? OWNER_ROLE : SUBSCRIBER_ROLE,
      })
    })

    recordAuthAttemptSuccess(attemptKey)
    await setUserSession(event, user.id)
    return { user: toSafeUser(user) }
  }
  catch (error) {
    if (isUniqueConstraintError(error)) {
      const { retryAfterMs } = recordAuthAttemptFailure(attemptKey)
      if (retryAfterMs > 0) {
        throwTooManyAttempts(event, retryAfterMs)
      }
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'A user with this email already exists.' })
    }
    throw error
  }
})
