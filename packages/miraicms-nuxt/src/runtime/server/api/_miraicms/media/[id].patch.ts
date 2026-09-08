import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { findMediaById, updateMedia } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { parseMediaId, toClientMediaRow } from '../../../utils/media'
import { requireUser } from '../../../utils/session'

interface UpdateBody {
  alt?: unknown
  caption?: unknown
}

function readText(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

/** Update editable media metadata (`alt`, `caption`). */
export default defineEventHandler(async (event): Promise<{ media: MediaItem }> => {
  await requireUser(event)

  const id = parseMediaId(getRouterParam(event, 'id'))
  const body = await readBody<UpdateBody>(event)
  const patch: { alt?: string | null, caption?: string | null } = {}
  const alt = readText(body?.alt)
  const caption = readText(body?.caption)
  if (alt !== undefined) {
    patch.alt = alt
  }
  if (caption !== undefined) {
    patch.caption = caption
  }

  const db = getDb()
  if (Object.keys(patch).length > 0) {
    const updated = await updateMedia(db, id, patch)
    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'File not found.' })
    }
    return { media: await toClientMediaRow(updated) }
  }

  const row = await findMediaById(db, id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }
  return { media: await toClientMediaRow(row) }
})
