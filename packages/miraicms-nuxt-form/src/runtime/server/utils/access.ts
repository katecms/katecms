import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { RoleAction } from '@miraicms/core'
import { requirePermission, requireUser } from 'miraicms-nuxt/server'

/**
 * Form builder and SMTP settings share the `forms` right.
 * `owner` and `admin` have it through full rights. `editor` has it by default.
 * Every other role needs `forms` in its own rights.
 */
export async function requireFormAccess(event: H3Event, action: RoleAction) {
  const actor = await requireUser(event)
  requirePermission(actor, 'forms', action, useRuntimeConfig().miraicms?.roles ?? {})
  return actor
}
