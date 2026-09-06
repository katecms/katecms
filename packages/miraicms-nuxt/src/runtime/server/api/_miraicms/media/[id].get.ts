import { createError, defineEventHandler, getRouterParam } from 'h3'
import { findMediaById } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { toClientMedia } from '../../../utils/media'

/**
 * Fetch a single media library entry by id.
 * Used to restore `returnFormat: 'id'` previews and to poll `variants_status`.
 */
export default defineEventHandler(async (event): Promise<{ media: MediaItem }> => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id.' })
  }

  const row = await findMediaById(getDb(), id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }

  return { media: toClientMedia(row) }
})
