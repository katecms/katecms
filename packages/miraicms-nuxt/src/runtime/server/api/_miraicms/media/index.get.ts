import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { MediaItem } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { applyMediaListFilter, listMediaMonths } from '../../../utils/media-list'
import type { MediaListFilter } from '../../../utils/media-list'
import { toClientMedia, uploaderNames } from '../../../utils/media'
import { requirePermission } from '../../../utils/permissions'
import { requireUser } from '../../../utils/session'
import {
  clampUtcOffsetMinutes,
  isMediaTypeFilter,
} from '../../../../utils/media-library-query'
import type { MediaLibraryPage, MediaTypeFilter } from '../../../../utils/media-library-query'

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 100

function readRaw(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}

function readInt(value: unknown): number | undefined {
  const raw = readRaw(value)
  if (!raw) {
    return undefined
  }
  const n = Number(raw)
  return Number.isInteger(n) ? n : undefined
}

function readType(value: unknown): MediaTypeFilter {
  const raw = readRaw(value)
  return isMediaTypeFilter(raw) ? raw : 'all'
}

function readMonth(value: unknown): string {
  const raw = readRaw(value)
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : ''
}

function readFilter(query: Record<string, unknown>): MediaListFilter {
  const offset = readInt(query.tz)
  return {
    type: readType(query.type),
    month: readMonth(query.month),
    search: readRaw(query.q).slice(0, 200),
    offsetMinutes: clampUtcOffsetMinutes(offset ?? 0),
  }
}

/** List media library entries, newest first. Requires `media:read`. */
export default defineEventHandler(async (event): Promise<MediaLibraryPage<MediaItem>> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'media', 'read', useRuntimeConfig().miraicms?.roles ?? {})

  const query = getQuery(event)
  const requestedLimit = readInt(query.limit)
  const requestedOffset = readInt(query.offset)
  const limit = requestedLimit != null && requestedLimit > 0
    ? Math.min(requestedLimit, MAX_LIMIT)
    : DEFAULT_LIMIT
  const offset = requestedOffset != null && requestedOffset > 0 ? requestedOffset : 0
  const filter = readFilter(query)
  const driver = useRuntimeConfig().miraicms?.database?.driver === 'postgres' ? 'postgres' : 'sqlite'

  const db = getDb()
  const filtered = applyMediaListFilter(db.selectFrom('media'), filter, driver)
  const [rows, totalRow, months] = await Promise.all([
    filtered
      .selectAll()
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute(),
    applyMediaListFilter(db.selectFrom('media'), filter, driver)
      .select(eb => eb.fn.countAll<number>().as('n'))
      .executeTakeFirst(),
    listMediaMonths(db, filter, driver),
  ])
  const names = await uploaderNames(rows.map(row => row.uploaded_by))
  return {
    media: rows.map(row => toClientMedia(
      row,
      row.uploaded_by != null ? names.get(row.uploaded_by) ?? null : null,
    )),
    total: Number(totalRow?.n ?? 0),
    months,
  }
})
