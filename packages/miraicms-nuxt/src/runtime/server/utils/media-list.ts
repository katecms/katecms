import type { Database } from '@miraicms/core'
import { sql, type RawBuilder, type SelectQueryBuilder, type SqlBool } from 'kysely'
import type { Kysely } from 'kysely'
import {
  ARCHIVE_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
  SPREADSHEET_MIME_TYPES,
  clampUtcOffsetMinutes,
  searchNeedle,
} from '../../utils/media-library-query'
import type { MediaTypeFilter } from '../../utils/media-library-query'

export interface MediaListFilter {
  type: MediaTypeFilter
  /** `YYYY-MM`, or empty for every month. */
  month: string
  search: string
  offsetMinutes: number
}

type MediaQuery<T> = SelectQueryBuilder<Database, 'media', T>

function exactMimes(type: MediaTypeFilter): readonly string[] | null {
  if (type === 'document') {
    return DOCUMENT_MIME_TYPES
  }
  if (type === 'spreadsheet') {
    return SPREADSHEET_MIME_TYPES
  }
  if (type === 'archive') {
    return ARCHIVE_MIME_TYPES
  }
  return null
}

/** Local `YYYY-MM` of `created_at`. SQLite stores UTC ISO text; Postgres stores timestamptz. */
function monthExpression(driver: 'sqlite' | 'postgres', offsetMinutes: number): RawBuilder<string> {
  const offset = clampUtcOffsetMinutes(offsetMinutes)
  if (driver === 'postgres') {
    return sql<string>`to_char((media.created_at AT TIME ZONE 'UTC') + (${offset} * interval '1 minute'), 'YYYY-MM')`
  }
  const modifier = `${offset >= 0 ? '+' : ''}${offset} minutes`
  return sql<string>`substr(datetime(substr(replace(replace(media.created_at, 'T', ' '), 'Z', ''), 1, 19), ${modifier}), 1, 7)`
}

export function applyMediaListFilter<T>(
  query: MediaQuery<T>,
  filter: MediaListFilter,
  driver: 'sqlite' | 'postgres',
): MediaQuery<T> {
  let next = query
  if (filter.type === 'image' || filter.type === 'audio' || filter.type === 'video') {
    next = next.where(sql<SqlBool>`lower(media.mime_type) like ${`${filter.type}/%`}`)
  }
  else {
    const mimes = exactMimes(filter.type)
    if (mimes) {
      next = next.where(sql<SqlBool>`lower(media.mime_type) in (${sql.join(mimes.map(mime => sql`${mime}`))})`)
    }
  }

  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(filter.month)) {
    const month = monthExpression(driver, filter.offsetMinutes)
    next = next.where(sql<SqlBool>`${month} = ${filter.month}`)
  }

  const needle = searchNeedle(filter.search)
  if (needle) {
    const pattern = `%${needle}%`
    next = next.where(sql<SqlBool>`(
      lower(media.filename) like ${pattern}
      or lower(coalesce(media.alt, '')) like ${pattern}
      or lower(coalesce(media.caption, '')) like ${pattern}
    )`)
  }

  return next
}

export async function listMediaMonths(
  db: Kysely<Database>,
  filter: MediaListFilter,
  driver: 'sqlite' | 'postgres',
): Promise<string[]> {
  const month = monthExpression(driver, filter.offsetMinutes)
  const rows = await applyMediaListFilter(
    db.selectFrom('media'),
    { ...filter, month: '' },
    driver,
  )
    .select(month.as('month'))
    .distinct()
    .execute()

  return rows
    .map(row => String(row.month ?? ''))
    .filter(value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    .sort((a, b) => b.localeCompare(a))
}
