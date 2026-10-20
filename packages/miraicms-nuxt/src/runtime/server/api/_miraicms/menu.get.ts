import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { RESOURCES, can } from '@miraicms/core'
import { getCurrentUser } from '../../utils/session'

/**
 * Resources the signed-in user may read. Addon menu items name one of these
 * in `access` and the admin shell hides the rest.
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    return { visible: [] as string[] }
  }
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  return {
    visible: RESOURCES.filter(resource => can(user, resource, 'read', { roles })),
  }
})
