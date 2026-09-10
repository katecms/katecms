import { createError } from 'h3'
import { can, canOnEntry } from '@miraicms/core'
import type { Resource, RoleAction, RoleHolder, RoleMap, SafeUser } from '@miraicms/core'

/**
 * Like {@link can} but throws 403 when the actor lacks the permission.
 * Pass `scope` for keyed resources (`collections`, `dictionaries`).
 */
export function requirePermission(
  user: RoleHolder,
  resource: Resource,
  action: RoleAction,
  roles: RoleMap,
  scope?: string,
): void {
  if (!can(user, resource, action, { roles, scope })) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Insufficient permissions.',
    })
  }
}

/**
 * Like {@link canOnEntry} but throws 403. Used for update/delete of a stored
 * collection row so authors can only change their own entries.
 */
export function requireEntryPermission(
  user: SafeUser,
  resource: Resource,
  action: RoleAction,
  entry: { authorId: number | null },
  roles: RoleMap,
  scope?: string,
): void {
  if (!canOnEntry(user, resource, action, entry, { roles, scope, userId: user.id })) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Insufficient permissions.',
    })
  }
}
