import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { can, hasAnyUser, type AuthState } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { getCurrentUser } from '../../../utils/session'

/**
 * Combined auth snapshot for the route guard:
 * - hasUsers drives the first-run flow (no users -> /admin/register, else /admin/login);
 * - user drives the authenticated redirects (keep logged-in users out of the
 *   auth pages).
 */
export default defineEventHandler(async (event): Promise<AuthState> => {
  const hasUsers = await hasAnyUser(getDb())
  const user = await getCurrentUser(event)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  return {
    user,
    hasUsers,
    access: {
      forms: user != null && can(user, 'forms', 'read', { roles }),
    },
  }
})
