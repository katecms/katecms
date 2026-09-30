import type { MediaItem } from '@miraicms/core'

/** Library filter shown in the media page and file pickers. */
export type MediaTypeFilter = 'all' | 'image' | 'audio' | 'video' | 'document' | 'spreadsheet' | 'archive'

/** How the library list is ordered. The part after the hyphen is the direction. */
export type MediaSort =
  | 'date-desc'
  | 'date-asc'
  | 'author-asc'
  | 'author-desc'
  | 'name-asc'
  | 'name-desc'
  | 'filesize-desc'
  | 'filesize-asc'
  | 'dimensions-desc'
  | 'dimensions-asc'

export interface MediaLibraryFilterState {
  type: MediaTypeFilter
  /** `all` or `YYYY-MM`. */
  month: string
  search: string
  sort: MediaSort
}

export interface MediaLibraryPage<T> {
  media: T[]
  total: number
  /** `YYYY-MM` values that contain matches for the current type and search. */
  months: string[]
}

export const MEDIA_TYPE_FILTERS: MediaTypeFilter[] = [
  'all',
  'image',
  'audio',
  'video',
  'document',
  'spreadsheet',
  'archive',
]

export const MEDIA_SORTS: MediaSort[] = [
  'date-desc',
  'date-asc',
  'author-asc',
  'author-desc',
  'name-asc',
  'name-desc',
  'filesize-desc',
  'filesize-asc',
  'dimensions-desc',
  'dimensions-asc',
]

export const MEDIA_SORT_CHOICES: { val: MediaSort, lbl: string }[] = [
  { val: 'date-desc', lbl: 'Date, newest' },
  { val: 'date-asc', lbl: 'Date, oldest' },
  { val: 'author-asc', lbl: 'Author, A–Z' },
  { val: 'author-desc', lbl: 'Author, Z–A' },
  { val: 'name-asc', lbl: 'File name, A–Z' },
  { val: 'name-desc', lbl: 'File name, Z–A' },
  { val: 'filesize-desc', lbl: 'File size, largest' },
  { val: 'filesize-asc', lbl: 'File size, smallest' },
  { val: 'dimensions-desc', lbl: 'Image size, largest' },
  { val: 'dimensions-asc', lbl: 'Image size, smallest' },
]

export const MEDIA_TYPE_CHOICES: { val: MediaTypeFilter, lbl: string }[] = [
  { val: 'all', lbl: 'All media items' },
  { val: 'image', lbl: 'Images' },
  { val: 'audio', lbl: 'Audio' },
  { val: 'video', lbl: 'Video' },
  { val: 'document', lbl: 'Documents' },
  { val: 'spreadsheet', lbl: 'Spreadsheets' },
  { val: 'archive', lbl: 'Archives' },
]

export const DOCUMENT_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word.document.macroEnabled.12',
  'application/vnd.ms-word.template.macroEnabled.12',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.apple.pages',
  'application/pdf',
  'application/vnd.ms-xpsdocument',
  'application/oxps',
  'application/rtf',
  'application/wordperfect',
  'application/octet-stream',
] as const

export const SPREADSHEET_MIME_TYPES = [
  'application/vnd.apple.numbers',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
] as const

export const ARCHIVE_MIME_TYPES = [
  'application/x-gzip',
  'application/rar',
  'application/x-tar',
  'application/zip',
  'application/x-7z-compressed',
] as const

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const MONTH_VALUE = /^\d{4}-(0[1-9]|1[0-2])$/

export function defaultMediaLibraryFilters(): MediaLibraryFilterState {
  return { type: 'all', month: 'all', search: '', sort: 'date-desc' }
}

export function isMediaTypeFilter(value: unknown): value is MediaTypeFilter {
  return typeof value === 'string' && MEDIA_TYPE_FILTERS.includes(value as MediaTypeFilter)
}

export function isMediaSort(value: unknown): value is MediaSort {
  return typeof value === 'string' && MEDIA_SORTS.includes(value as MediaSort)
}

export function normalizeMediaLibraryFilters(value: MediaLibraryFilterState): MediaLibraryFilterState {
  return {
    type: isMediaTypeFilter(value.type) ? value.type : 'all',
    month: MONTH_VALUE.test(value.month) ? value.month : 'all',
    search: value.search.slice(0, 200),
    sort: isMediaSort(value.sort) ? value.sort : 'date-desc',
  }
}

export function mediaFiltersActive(filters: MediaLibraryFilterState): boolean {
  const normalized = normalizeMediaLibraryFilters(filters)
  return normalized.type !== 'all'
    || normalized.month !== 'all'
    || searchNeedle(normalized.search).length > 0
}

/** Minutes to add to UTC to get the viewer's local time. */
export function clampUtcOffsetMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(-14 * 60, Math.min(14 * 60, Math.trunc(value)))
}

export function localUtcOffsetMinutes(now = new Date()): number {
  return clampUtcOffsetMinutes(-now.getTimezoneOffset())
}

export function monthLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) {
    return value
  }
  const month = Number(match[2])
  if (month < 1 || month > 12) {
    return value
  }
  return `${MONTH_NAMES[month - 1]} ${match[1]}`
}

/** Local calendar month for an ISO timestamp, as `YYYY-MM`. */
export function monthKey(iso: string, offsetMinutes: number): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) {
    return ''
  }
  const shifted = new Date(time + clampUtcOffsetMinutes(offsetMinutes) * 60_000)
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  return `${shifted.getUTCFullYear()}-${month}`
}

/** Search text with LIKE wildcards removed. */
export function searchNeedle(value: string): string {
  return value.trim().slice(0, 200).toLowerCase().replace(/[%_\\]/g, '')
}

export function matchesMediaType(mime: string, type: MediaTypeFilter): boolean {
  if (type === 'all') {
    return true
  }
  const normalized = mime.trim().toLowerCase()
  if (type === 'image' || type === 'audio' || type === 'video') {
    return normalized.startsWith(`${type}/`)
  }
  const list = type === 'document'
    ? DOCUMENT_MIME_TYPES
    : type === 'spreadsheet'
      ? SPREADSHEET_MIME_TYPES
      : ARCHIVE_MIME_TYPES
  return (list as readonly string[]).includes(normalized)
}

export function mediaMatchesFilters(
  item: Pick<MediaItem, 'mime_type' | 'filename' | 'alt' | 'caption' | 'created_at'>,
  filters: MediaLibraryFilterState,
  offsetMinutes = localUtcOffsetMinutes(),
): boolean {
  const normalized = normalizeMediaLibraryFilters(filters)
  if (!matchesMediaType(item.mime_type, normalized.type)) {
    return false
  }
  if (normalized.month !== 'all' && monthKey(item.created_at, offsetMinutes) !== normalized.month) {
    return false
  }
  const needle = searchNeedle(normalized.search)
  if (!needle) {
    return true
  }
  const haystack = `${item.filename}\n${item.alt ?? ''}\n${item.caption ?? ''}`.toLowerCase()
  return haystack.includes(needle)
}

/**
 * Query string for `GET /api/_miraicms/media`.
 * Image pickers pass `baseType: 'image'` so "All media items" still pages through images only.
 */
export function mediaLibraryQuery(
  filters: MediaLibraryFilterState,
  paging: { limit: number, offset: number },
  baseType?: 'image',
): Record<string, string | number> {
  const normalized = normalizeMediaLibraryFilters(filters)
  const type = normalized.type === 'all' && baseType === 'image' ? 'image' : normalized.type
  const needle = searchNeedle(normalized.search)
  const query: Record<string, string | number> = {
    limit: paging.limit,
    offset: paging.offset,
    tz: localUtcOffsetMinutes(),
  }
  if (type !== 'all') {
    query.type = type
  }
  if (normalized.month !== 'all') {
    query.month = normalized.month
  }
  if (needle) {
    query.q = needle
  }
  if (normalized.sort !== 'date-desc') {
    query.sort = normalized.sort
  }
  return query
}
