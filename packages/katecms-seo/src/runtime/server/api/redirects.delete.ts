import { createError, defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import { requirePermission, requireUser } from 'katecms/server'
import { deleteRedirects, listRedirects } from '../utils/redirects'
import type { SeoRedirect } from '../../types'

export default defineEventHandler(async (event): Promise<SeoRedirect[]> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'options', 'update', useRuntimeConfig().katecms?.roles ?? {})
  const query = getQuery(event)
  const raw = query.ids ?? query.id
  const parts = (Array.isArray(raw) ? raw : [raw])
    .flatMap(value => String(value ?? '').split(','))
  const ids = parts.map(value => Number(value)).filter(id => Number.isInteger(id) && id > 0)
  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid redirect.' })
  }
  await deleteRedirects(ids)
  return listRedirects()
})