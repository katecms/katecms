import { createError, defineEventHandler, readBody } from 'h3'
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
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

  if (!validateEmail(email).ok) {
    failValidation('Введите корректный email.')
  }
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.ok) {
    const statusMessage = password.length < MIN_PASSWORD_LENGTH
      ? `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов.`
      : `Пароль не должен превышать ${MAX_PASSWORD_LENGTH} символов.`
    failValidation(statusMessage)
  }
  if (password !== passwordConfirm) {
    failValidation('Пароли не совпадают.')
  }

  const passwordHash = await hashPassword(password)

  try {
    const user = await getDb().transaction().execute(async (trx) => {
      const isFirstUser = !(await hasAnyUser(trx))
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
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Пользователь с таким email уже существует.' })
    }
    throw error
  }
})
