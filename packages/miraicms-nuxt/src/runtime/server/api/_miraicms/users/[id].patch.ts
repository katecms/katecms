import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  can,
  findUserById,
  hashPassword,
  isOwner,
  isUniqueConstraintError,
  isValidRole,
  OWNER_ROLE,
  updateUser,
  validateEmail,
  validatePassword,
  verifyPassword,
} from '@miraicms/core'
import type { UserStatus } from '@miraicms/core'
import type { AdminUser } from '../../../../utils/admin-users'
import { getDb } from '../../../utils/db'
import {
  assertAuthAttemptAllowed,
  recordAuthAttemptFailure,
  recordAuthAttemptSuccess,
  throwTooManyAttempts,
} from '../../../utils/auth-rate-limit'
import { requireUser, setUserSession } from '../../../utils/session'
import {
  fail,
  readAvatar,
  readName,
  toAdminUser,
} from '../../../utils/users'

interface UpdateBody {
  email?: unknown
  password?: unknown
  currentPassword?: unknown
  name?: unknown
  avatar?: unknown
  role?: unknown
  status?: unknown
}

const STATUSES: readonly UserStatus[] = ['active', 'banned']

/**
 * Update a user.
 *
 * Access rules:
 * - editing your own account is always allowed (name / email / avatar);
 * - changing your own password also requires `currentPassword`;
 * - a manager may set another account's password without the old one;
 * - editing someone else requires the `users` update permission;
 * - `role` and `status` can only be changed by a manager editing *another*
 *   account (you can't change your own role/status, which prevents both
 *   self-lockout and privilege escalation);
 * - the `owner` account can only be edited by the owner themselves, and the
 *   reserved `owner` role can never be assigned.
 */
export default defineEventHandler(async (event): Promise<{ user: AdminUser }> => {
  const actor = await requireUser(event)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    fail(400, 'Invalid user id.')
  }

  const isSelf = actor.id === id
  const canManage = can(actor, 'users', 'update', { roles })
  if (!canManage && !isSelf) {
    fail(403, 'Insufficient permissions.')
  }

  const db = getDb()
  const target = await findUserById(db, id)
  if (!target) {
    fail(404, 'User not found.')
  }

  if (isOwner(target, roles) && !isSelf) {
    fail(403, 'The site owner cannot be changed.')
  }

  const body = await readBody<UpdateBody>(event)
  const patch: {
    email?: string
    password_hash?: string
    name?: string | null
    avatar?: ReturnType<typeof readAvatar>
    role?: string
    status?: UserStatus
  } = {}

  if (body?.email !== undefined) {
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const emailCheck = validateEmail(email)
    if (!emailCheck.ok) {
      fail(422, emailCheck.error)
    }
    patch.email = email
  }

  if (typeof body?.password === 'string' && body.password.length > 0) {
    const passwordCheck = validatePassword(body.password)
    if (!passwordCheck.ok) {
      fail(422, passwordCheck.error)
    }
    if (isSelf) {
      const attemptKey = `password:${actor.id}`
      assertAuthAttemptAllowed(event, attemptKey)
      const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
      const matches = currentPassword.length > 0 && await verifyPassword(currentPassword, target.password_hash)
      if (!matches) {
        const { retryAfterMs } = recordAuthAttemptFailure(attemptKey)
        if (retryAfterMs > 0) {
          throwTooManyAttempts(event, retryAfterMs)
        }
        fail(422, 'Current password is incorrect.')
      }
      recordAuthAttemptSuccess(attemptKey)
    }
    patch.password_hash = await hashPassword(body.password)
  }

  if (body?.name !== undefined) {
    patch.name = readName(body.name)
  }

  if (body?.avatar !== undefined) {
    patch.avatar = readAvatar(body.avatar)
  }

  if (body?.role !== undefined) {
    if (!canManage || isSelf) {
      fail(403, 'Cannot change this account role.')
    }
    const role = typeof body.role === 'string' ? body.role : ''
    if (role === OWNER_ROLE) {
      fail(422, 'The owner role cannot be assigned.')
    }
    if (!isValidRole(roles, role)) {
      fail(422, 'Unknown role.')
    }
    patch.role = role
  }

  if (body?.status !== undefined) {
    if (!canManage || isSelf) {
      fail(403, 'Cannot change this account status.')
    }
    const status = body.status as UserStatus
    if (!STATUSES.includes(status)) {
      fail(422, 'Invalid status.')
    }
    patch.status = status
  }

  try {
    const row = await updateUser(db, id, patch)
    if (!row) {
      fail(404, 'User not found.')
    }
    if (isSelf && patch.password_hash) {
      await setUserSession(event, row.id, row.session_version)
    }
    return { user: toAdminUser(row) }
  }
  catch (error) {
    if (isUniqueConstraintError(error)) {
      fail(409, 'A user with this email already exists.')
    }
    if (error instanceof Error && error.message.includes('last owner')) {
      fail(422, 'Cannot remove the last owner.')
    }
    throw error
  }
})
