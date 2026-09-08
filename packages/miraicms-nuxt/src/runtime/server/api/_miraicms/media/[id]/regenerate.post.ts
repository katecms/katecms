import { createError, defineEventHandler, getRouterParam } from 'h3'
import { findMediaById, hasImageWork, isProcessableImage, updateMedia } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { getDb } from '../../../../utils/db'
import { getMediaConfig, parseMediaId, scheduleBackground, storedVariants, toClientMediaRow } from '../../../../utils/media'
import { regenerateMedia } from '../../../../utils/regenerate'
import { requireUser } from '../../../../utils/session'

/**
 * Queue variant regeneration for one image. Clients poll GET by id for `ready` / `failed`.
 */
export default defineEventHandler(async (event): Promise<{ media: MediaItem }> => {
  await requireUser(event)

  const id = parseMediaId(getRouterParam(event, 'id'))
  const row = await findMediaById(getDb(), id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }
  if (!isProcessableImage(row.mime_type)) {
    throw createError({ statusCode: 422, statusMessage: 'This file is not an image.' })
  }

  const willGenerate = hasImageWork(getMediaConfig())
  const status = willGenerate ? 'pending' as const : 'none' as const
  const pending = await updateMedia(getDb(), id, { variants_status: status }) ?? { ...row, variants_status: status }

  scheduleBackground(event, regenerateMedia({
    id: row.id,
    filename: row.filename,
    mime_type: row.mime_type,
    variants: storedVariants(row.variants),
  }))

  return { media: await toClientMediaRow(pending) }
})
