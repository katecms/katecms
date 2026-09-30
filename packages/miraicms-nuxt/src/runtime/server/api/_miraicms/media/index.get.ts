import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import { listMedia } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { toClientMedia, uploaderNames } from '../../../utils/media'
import { requirePermission } from '../../../utils/permissions'
import { requireUser } from '../../../utils/session'

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 100

function readInt(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined
  }
  const n = Number(raw)
  return Number.isInteger(n) ? n : undefined
}

/** List media library entries, newest first. Requires `media:read`. */
export default defineEventHandler(async (event): Promise<{ media: MediaItem[], total: number }> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'media', 'read', useRuntimeConfig().miraicms?.roles ?? {})

  const query = getQuery(event)
  const requestedLimit = readInt(query.limit)
  const requestedOffset = readInt(query.offset)
  const limit = requestedLimit != null && requestedLimit > 0
    ? Math.min(requestedLimit, MAX_LIMIT)
    : DEFAULT_LIMIT
  const offset = requestedOffset != null && requestedOffset > 0 ? requestedOffset : 0

  const db = getDb()
  const [rows, totalRow] = await Promise.all([
    listMedia(db, { limit, offset }),
    db.selectFrom('media').select(eb => eb.fn.countAll<number>().as('n')).executeTakeFirst(),
  ])
  const names = await uploaderNames(rows.map(row => row.uploaded_by))
  return {
    media: rows.map(row => toClientMedia(
      row,
      row.uploaded_by != null ? names.get(row.uploaded_by) ?? null : null,
    )),
    total: Number(totalRow?.n ?? 0),
  }
})
