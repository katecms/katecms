import { createError, defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import { can, fetchOembed, getRole } from '@miraicms/core'
import type { ResourceRights, RoleMap, SafeUser } from '@miraicms/core'
import { connectOembed, resolveOembedHost } from '../../utils/oembed-fetch'
import { requireUser } from '../../utils/session'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function canWrite(right: ResourceRights | undefined): boolean {
  if (right === true) {
    return true
  }
  return Array.isArray(right) && (right.includes('create') || right.includes('update'))
}

/** Editors of collections or media. Read-only roles cannot use the fetcher. */
function canFetchOembed(user: SafeUser, roles: RoleMap): boolean {
  if (can(user, 'media', 'read', { roles })) {
    return true
  }
  if (can(user, 'collections', 'create', { roles }) || can(user, 'collections', 'update', { roles })) {
    return true
  }
  const collections = getRole(roles, user.role)?.rights.collections
  if (!collections || typeof collections !== 'object' || Array.isArray(collections)) {
    return false
  }
  return Object.values(collections).some(right => canWrite(right))
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  if (!canFetchOembed(user, roles)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Insufficient permissions.',
    })
  }

  const query = getQuery(event)
  const result = await fetchOembed({
    url: queryString(query.url) ?? '',
    maxwidth: queryString(query.maxwidth),
    maxheight: queryString(query.maxheight),
    resolve: resolveOembedHost,
    connect: connectOembed,
  })

  if (!result.ok) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.error,
    })
  }

  return result.data
})
