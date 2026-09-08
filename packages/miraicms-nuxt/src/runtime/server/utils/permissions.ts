import { createError } from 'h3'
import { can } from '@miraicms/core'
import type { Resource, RoleAction, RoleHolder, RoleMap } from '@miraicms/core'

/**
 * Like {@link can} but throws 403 when the actor lacks the permission.
 */
export function requirePermission(
  user: RoleHolder,
  resource: Resource,
  action: RoleAction,
  roles: RoleMap,
): void {
  if (!can(user, resource, action, { roles })) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Insufficient permissions.',
    })
  }
}
