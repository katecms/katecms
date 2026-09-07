import { defineEventHandler, useRuntimeConfig } from '#imports'
import {
  can,
  findUserById,
  listUsers,
  toUserFieldValue,
} from '@miraicms/core'
import type { UserFieldValue } from '@miraicms/core'
import { getDb } from '../../utils/db'
import { requireUser } from '../../utils/session'

/**
 * Accounts the current user may pick in a `user` field.
 * Password hashes are never returned. Managers see every account; others see themselves.
 */
export default defineEventHandler(async (event): Promise<{ users: UserFieldValue[] }> => {
  const actor = await requireUser(event)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  const db = getDb()

  if (can(actor, 'users', 'read', { roles })) {
    const rows = await listUsers(db)
    return { users: rows.map(toUserFieldValue) }
  }

  const row = await findUserById(db, actor.id)
  return { users: row ? [toUserFieldValue(row)] : [] }
})
