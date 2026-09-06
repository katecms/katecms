import { defineEventHandler } from 'h3'
import { hasAnyUser, type AuthState } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { getCurrentUser } from '../../../utils/session'

/**
 * Combined auth snapshot for the route guard:
 * - hasUsers drives the first-run flow (no users -> /register, else /login);
 * - user drives the authenticated redirects (keep logged-in users out of the
 *   auth pages).
 */
export default defineEventHandler(async (event): Promise<AuthState> => {
  const hasUsers = await hasAnyUser(getDb())
  const user = await getCurrentUser(event)
  return { user, hasUsers }
})
