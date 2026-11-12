import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { findMediaById } from '@katecms/core'
import type { MediaItem } from '@katecms/core'
import { getDb } from '../../../utils/db'
import { parseMediaId, toClientMediaRow } from '../../../utils/media'
import { requirePermission } from '../../../utils/permissions'
import { requireUser } from '../../../utils/session'

/**
 * Fetch a single media library entry by id.
 * Used to restore `returnFormat: 'id'` previews and to poll `variants_status`.
 */
export default defineEventHandler(async (event): Promise<{ media: MediaItem }> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'media', 'read', useRuntimeConfig().katecms?.roles ?? {})

  const id = parseMediaId(getRouterParam(event, 'id'))
  const row = await findMediaById(getDb(), id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }

  return { media: await toClientMediaRow(row) }
})
