import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  createUser,
  hashPassword,
  isUniqueConstraintError,
  isValidRole,
  OWNER_ROLE,
  validateEmail,
  validatePassword,
} from '@miraicms/core'
import type { AdminUser } from '../../../utils/admin-users'
import { getDb } from '../../utils/db'
import { requirePermission } from '../../utils/permissions'
import { requireUser } from '../../utils/session'
import {
  defaultAssignableRole,
  fail,
  readAvatar,
  readName,
  toAdminUser,
} from '../../utils/users'

interface CreateBody {
  email?: unknown
  password?: unknown
  name?: unknown
  avatar?: unknown
  role?: unknown
}

/**
 * Create a user. Requires the `users` create permission (the `owner` superuser
 * always passes). The reserved `owner` role can't be assigned — ownership is
 * only ever granted to the first registered account.
 */
export default defineEventHandler(async (event): Promise<{ user: AdminUser }> => {
  const actor = await requireUser(event)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'users', 'create', roles)

  const body = await readBody<CreateBody>(event)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = readName(body?.name)
  const avatar = readAvatar(body?.avatar)
  const role = typeof body?.role === 'string' && body.role.trim()
    ? body.role.trim()
    : defaultAssignableRole(roles)

  const emailCheck = validateEmail(email)
  if (!emailCheck.ok) {
    fail(422, emailCheck.error)
  }
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.ok) {
    fail(422, passwordCheck.error)
  }

  if (role === OWNER_ROLE) {
    fail(422, 'The owner role cannot be assigned.')
  }
  if (!isValidRole(roles, role)) {
    fail(422, 'Unknown role.')
  }

  const passwordHash = await hashPassword(password)

  try {
    const row = await createUser(getDb(), {
      email,
      password_hash: passwordHash,
      name,
      avatar,
      role,
    })
    return { user: toAdminUser(row) }
  }
  catch (error) {
    if (isUniqueConstraintError(error)) {
      fail(409, 'A user with this email already exists.')
    }
    throw error
  }
})
