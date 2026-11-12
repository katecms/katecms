import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  can,
  deleteUser,
  findUserById,
  isOwner,
} from '@katecms/core'
import { getDb } from '../../../utils/db'
import { requireUser } from '../../../utils/session'
import { fail } from '../../../utils/users'

/**
 * Delete another user.
 *
 * Requires `users` delete. You cannot delete yourself. A site owner can be
 * deleted only by an owner, and never when they are the last owner.
 * Entries and uploads they authored stay; the author link is cleared.
 */
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const actor = await requireUser(event)
  const roles = useRuntimeConfig().katecms?.roles ?? {}
  if (!can(actor, 'users', 'delete', { roles })) {
    fail(403, 'Insufficient permissions.')
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    fail(400, 'Invalid user id.')
  }
  if (id === actor.id) {
    fail(403, 'You cannot delete your own account.')
  }

  const db = getDb()
  const target = await findUserById(db, id)
  if (!target) {
    fail(404, 'User not found.')
  }
  if (isOwner(target, roles) && !isOwner(actor, roles)) {
    fail(403, 'The site owner cannot be deleted.')
  }

  try {
    const row = await deleteUser(db, id)
    if (!row) {
      fail(404, 'User not found.')
    }
    return { ok: true }
  }
  catch (error) {
    if (error instanceof Error && error.message.includes('last owner')) {
      fail(422, 'Cannot remove the last owner.')
    }
    throw error
  }
})
