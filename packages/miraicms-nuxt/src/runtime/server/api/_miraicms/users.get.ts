import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  can,
  findUserById,
  listUsers,
} from '@miraicms/core'
import type { User } from '@miraicms/core'
import { getDb } from '../../utils/db'
import { requireUser } from '../../utils/session'
import { roleOptions, toAdminUser } from '../../utils/users'
import type { UsersResponse } from '../../../utils/admin-users'

/**
 * Accounts for the admin users UI and the `user` field picker.
 *
 * Password hashes are never returned. Managers (read/create/update on `users`)
 * see every account; others see only themselves. Extra capability flags power
 * the admin list; the picker only reads `users`.
 */
export default defineEventHandler(async (event): Promise<UsersResponse> => {
  const actor = await requireUser(event)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  const db = getDb()

  const canCreate = can(actor, 'users', 'create', { roles })
  const canUpdate = can(actor, 'users', 'update', { roles })
  const isManager = can(actor, 'users', 'read', { roles }) || canCreate || canUpdate

  let rows: User[]
  if (isManager) {
    rows = await listUsers(db)
  }
  else {
    const row = await findUserById(db, actor.id)
    rows = row ? [row] : []
  }

  return {
    users: rows.map(toAdminUser),
    roles: roleOptions(roles),
    currentUserId: actor.id,
    canCreate,
    canUpdate,
  }
})
