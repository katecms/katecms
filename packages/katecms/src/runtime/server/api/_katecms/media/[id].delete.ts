import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { deleteMedia, findMediaById } from '@katecms/core'
import { getDb } from '../../../utils/db'
import { getMediaStorage, parseMediaId, storedVariants } from '../../../utils/media'
import { requirePermission } from '../../../utils/permissions'
import { requireUser } from '../../../utils/session'

/**
 * Delete a media row and its files. Missing binaries do not block the row delete.
 */
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'media', 'delete', useRuntimeConfig().katecms?.roles ?? {})

  const id = parseMediaId(getRouterParam(event, 'id'))
  const row = await findMediaById(getDb(), id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }

  const storage = getMediaStorage()
  const keys = [row.filename, ...storedVariants(row.variants).map(variant => variant.filename)]
  await Promise.all(keys.map(key => storage.delete(key).catch(() => {})))
  await deleteMedia(getDb(), id)

  return { ok: true }
})
