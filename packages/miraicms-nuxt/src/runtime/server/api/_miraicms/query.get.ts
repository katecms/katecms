import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  buildSlugPathMap,
  can,
  collectionListPaging,
  collectionPerPage,
  countQueryCollections,
  DEFAULT_COLLECTION_PER_PAGE,
  isCollectionQueryOrderBy,
  parseDictionaryQuery,
  queryCollections,
} from '@miraicms/core'
import type {
  CollectionDefinition,
  CollectionQueryOrderBy,
  DictionaryQuery,
  QueryCollectionsOptions,
} from '@miraicms/core'
import { getDb } from '../../utils/db'
import { getCurrentUser } from '../../utils/session'
import {
  fail,
  getCollectionDefinition,
  getCollections,
  readPage,
  readPerPage,
  readSearch,
  toAdminEntry,
  toCollectionMeta,
} from '../../utils/collections'
import { loadAssignedEntryDictionaries } from '../../utils/dictionaries'
import {
  isTruthyQueryParam,
  parsePublicStatusParam,
  resolvePublicStatuses,
} from '../../../utils/preview'
import type { QueryCollectionResponse } from '../../../utils/collections'

const ORDER_ALIASES: Record<string, CollectionQueryOrderBy> = {
  date: 'published_at',
  modified: 'updated_at',
  name: 'slug',
  ID: 'id',
}

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function hasQueryParam(query: Record<string, unknown>, keys: string[]): boolean {
  return keys.some(key => query[key] !== undefined)
}

function readStringList(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return [...new Set(parts.map(item => String(item).trim()).filter(Boolean))]
}

function readIdList(value: unknown): number[] {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value == null ? [] : [value]
  const ids: number[] = []
  const seen = new Set<number>()
  for (const part of parts) {
    const n = Number(part)
    if (!Number.isInteger(n) || n < 1 || seen.has(n)) {
      continue
    }
    seen.add(n)
    ids.push(n)
  }
  return ids
}

function readParentIdList(value: unknown): number[] {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value == null ? [] : [value]
  const ids: number[] = []
  const seen = new Set<number>()
  for (const part of parts) {
    if (part === null || part === 'null') {
      if (!seen.has(0)) {
        seen.add(0)
        ids.push(0)
      }
      continue
    }
    if (part === '') {
      continue
    }
    const n = Number(part)
    if (!Number.isInteger(n) || n < 0 || seen.has(n)) {
      continue
    }
    seen.add(n)
    ids.push(n)
  }
  return ids
}

function readOrderBy(value: unknown): CollectionQueryOrderBy | undefined {
  const raw = firstQueryValue(value)
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined
  }
  const token = raw.trim()
  if (token === 'includeIds') {
    return 'includeIds'
  }
  const mapped = ORDER_ALIASES[token] ?? token
  return isCollectionQueryOrderBy(mapped) ? mapped : undefined
}

function readOrder(value: unknown): 'asc' | 'desc' | undefined {
  const raw = firstQueryValue(value)
  if (typeof raw !== 'string') {
    return undefined
  }
  const token = raw.trim().toLowerCase()
  if (token === 'asc' || token === 'desc') {
    return token
  }
  return undefined
}

function readDictionaryQuery(value: unknown): DictionaryQuery | undefined {
  const raw = firstQueryValue(value)
  if (raw == null || raw === '') {
    return undefined
  }
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    }
    catch {
      fail(400, 'Invalid dictionaryQuery.')
    }
  }
  if (typeof parsed !== 'object' || parsed == null || Array.isArray(parsed)) {
    fail(400, 'Invalid dictionaryQuery.')
  }
  return parseDictionaryQuery(parsed)
}

function defaultPerPage(defs: CollectionDefinition[]): number {
  if (defs.length === 1) {
    return collectionPerPage(defs[0])
  }
  return DEFAULT_COLLECTION_PER_PAGE
}

/**
 * Public list query.
 *
 * Query:
 * - `collection` (required) — comma-separated collection slugs
 * - `preview` — `1`/`true`/`yes` to include drafts when the requester may
 *   `collections:read` every queried collection
 * - `status` — `published`, `draft`, or comma-separated; `draft` is ignored
 *   unless preview is granted. Trash is never returned.
 * - `page`, `perPage`
 * - `search`, `title`, `includeIds`, `excludeIds`
 * - `parentId` (`0` = top-level), `parentIds`, `excludeParentIds`
 * - `authorIn`, `authorNotIn`, `slug`, `slugs`
 * - `dictionaryQuery` — JSON object (`relation` + `queries`)
 * - `orderBy` (`date`, `modified`, `name`, `includeIds`, or a column), `order`
 *
 * Collections with `public: false` are skipped. Unknown types are skipped.
 */
export default defineEventHandler(async (event): Promise<QueryCollectionResponse> => {
  const query = getQuery(event) as Record<string, unknown>
  const requested = readStringList(query.collection)
  if (requested.length === 0) {
    fail(400, 'Missing collection.')
  }

  const all = getCollections()
  const types = requested.filter((slug) => {
    const def = all[slug]
    return def != null && def.public !== false
  })
  const defs = types
    .map(slug => getCollectionDefinition(slug))
    .filter((def): def is CollectionDefinition => def != null)

  if (types.length === 0) {
    return {
      entries: [],
      collections: [],
      preview: false,
      page: readPage(query.page),
      perPage: readPerPage(query.perPage, DEFAULT_COLLECTION_PER_PAGE),
      total: 0,
    }
  }

  const previewRequested = isTruthyQueryParam(query.preview)
  const actor = previewRequested ? await getCurrentUser(event) : null
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  const previewAllowed = actor != null
    && types.every(slug => can(actor, 'collections', 'read', { roles, scope: slug }))

  const { statuses, preview } = resolvePublicStatuses({
    previewRequested,
    previewAllowed,
    requested: parsePublicStatusParam(query.status),
  })

  const page = readPage(query.page)
  const perPage = readPerPage(query.perPage, defaultPerPage(defs))
  const filters: QueryCollectionsOptions = {
    types,
    statuses,
    search: readSearch(query.search) || undefined,
    ...collectionListPaging(page, perPage),
  }

  if (hasQueryParam(query, ['title'])) {
    filters.title = readStringList(query.title)
  }
  if (hasQueryParam(query, ['includeIds'])) {
    filters.includeIds = readIdList(query.includeIds)
  }
  if (hasQueryParam(query, ['excludeIds'])) {
    filters.excludeIds = readIdList(query.excludeIds)
  }
  if (hasQueryParam(query, ['parentId', 'parentIds'])) {
    filters.parentIds = [
      ...readParentIdList(query.parentIds),
      ...readParentIdList(query.parentId),
    ]
  }
  if (hasQueryParam(query, ['excludeParentIds'])) {
    filters.excludeParentIds = readParentIdList(query.excludeParentIds)
  }
  if (hasQueryParam(query, ['authorIn'])) {
    filters.authorIn = readIdList(query.authorIn)
  }
  if (hasQueryParam(query, ['authorNotIn'])) {
    filters.authorNotIn = readIdList(query.authorNotIn)
  }
  if (hasQueryParam(query, ['slug', 'slugs'])) {
    filters.slugs = [
      ...readStringList(query.slugs),
      ...readStringList(query.slug),
    ]
  }
  if (hasQueryParam(query, ['dictionaryQuery'])) {
    filters.dictionaryQuery = readDictionaryQuery(query.dictionaryQuery)
  }
  filters.orderBy = readOrderBy(query.orderBy) ?? 'published_at'
  const order = readOrder(query.order)
  if (order) {
    filters.order = order
  }

  const db = getDb()
  const [rows, total, pathRows] = await Promise.all([
    queryCollections(db, filters),
    countQueryCollections(db, filters),
    db.selectFrom('collections')
      .select(['id', 'slug', 'parent_id', 'type'])
      .where('type', 'in', types)
      .execute(),
  ])

  const pathsByType = new Map<string, ReturnType<typeof buildSlugPathMap>>()
  for (const type of types) {
    pathsByType.set(
      type,
      buildSlugPathMap(pathRows.filter(row => row.type === type)),
    )
  }

  const entries = await Promise.all(rows.map(async (row) => {
    const dictionaries = await loadAssignedEntryDictionaries(db, row.id, row.type)
    return toAdminEntry(row, pathsByType.get(row.type)?.get(row.id) ?? row.slug, { dictionaries })
  }))

  return {
    entries,
    collections: types.flatMap((slug) => {
      const def = getCollectionDefinition(slug)
      return def ? [toCollectionMeta(slug, def)] : []
    }),
    preview,
    page,
    perPage,
    total,
  }
})
