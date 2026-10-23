import { defineEventHandler, getQuery } from 'h3'
import {
  isTermOrderBy,
  isTermsReturn,
  parseFieldsQuery,
  queryTerms,
  UNLIMITED_COLLECTION_PER_PAGE,
} from '@miraicms/core'
import type {
  Collections,
  Dictionaries,
  FieldsQuery,
  FieldsQueryCast,
  QueryTermsOptions,
  QueryTermsResult,
  TermOrderField,
} from '@miraicms/core'
import { getDb } from '../../utils/db'
import { rejectPublicRegexp } from '../../utils/public-fields-query'
import { fail, getCollections, readPerPage } from '../../utils/collections'
import { getDictionaries } from '../../utils/dictionaries'

const CASTS = new Set<string>(['TEXT', 'INTEGER', 'NUMERIC', 'DATETIME', 'DATE', 'TIME'])

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function readStringList(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return [...new Set(parts.map(item => String(item).trim()).filter(Boolean))]
}

function readIdList(value: unknown): number[] {
  const parts = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : value == null
        ? []
        : [value]
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

function hasQueryParam(query: Record<string, unknown>, key: string): boolean {
  return query[key] !== undefined
}

function readBool(value: unknown, fallback: boolean): boolean {
  const raw = firstQueryValue(value)
  if (raw == null || raw === '') {
    return fallback
  }
  if (typeof raw === 'boolean') {
    return raw
  }
  const token = String(raw).trim().toLowerCase()
  if (token === '1' || token === 'true' || token === 'yes') {
    return true
  }
  if (token === '0' || token === 'false' || token === 'no') {
    return false
  }
  return fallback
}

function readOffset(value: unknown): number {
  const raw = firstQueryValue(value)
  if (raw == null || raw === '') {
    return 0
  }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) {
    fail(400, 'Invalid offset.')
  }
  return n
}

function readParentId(value: unknown): number | null {
  const raw = firstQueryValue(value)
  if (raw == null || raw === '' || raw === 'null' || raw === 0 || raw === '0') {
    return null
  }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) {
    fail(400, 'Invalid parentId.')
  }
  return n
}

function readChildOf(value: unknown): number | undefined {
  const raw = firstQueryValue(value)
  if (raw == null || raw === '' || raw === 0 || raw === '0') {
    return undefined
  }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) {
    fail(400, 'Invalid childOf.')
  }
  return n
}

function readFieldsQuery(value: unknown): FieldsQuery | undefined {
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
      fail(400, 'Invalid fieldsQuery.')
    }
  }
  if (typeof parsed !== 'object' || parsed == null || Array.isArray(parsed)) {
    fail(400, 'Invalid fieldsQuery.')
  }
  return rejectPublicRegexp(parseFieldsQuery(parsed))
}

function readOrderByField(value: unknown): TermOrderField | undefined {
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
      fail(400, 'Invalid orderByField.')
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(400, 'Invalid orderByField.')
  }
  const key = typeof (parsed as { key?: unknown }).key === 'string'
    ? (parsed as { key: string }).key.trim()
    : ''
  if (!key) {
    fail(400, 'Invalid orderByField.')
  }
  const typeRaw = (parsed as { type?: unknown }).type
  const type = typeof typeRaw === 'string' && CASTS.has(typeRaw.trim().toUpperCase())
    ? typeRaw.trim().toUpperCase() as FieldsQueryCast
    : undefined
  return type ? { key, type } : { key }
}

function publicCollectionSlugs(all: Collections): string[] {
  return Object.keys(all).filter(slug => all[slug]?.public !== false)
}

function resolveDictionaries(requested: string[], all: Dictionaries): string[] {
  const known = new Set(Object.keys(all))
  return requested.filter(slug => known.has(slug))
}

/**
 * Public dictionary-term query.
 *
 * Query:
 * - `dictionary` (required) — comma-separated dictionary slugs
 * - `perPage` (`-1` or omitted — all), `offset`
 * - `includeIds`, `excludeIds`, `excludeTreeIds`
 * - `parentId` (`0` = top-level), `childOf`, `childless`
 * - `slug`, `title`, `search`
 * - `hideEmpty` (default true), `hierarchical` (default true), `padCounts`
 * - `fieldsQuery` — JSON object (`relation` + `queries`) against term `fields`.
 *   `REGEXP` and `NOT REGEXP` are rejected.
 * - `orderBy`, `order`, `orderByField` — JSON `{ key, type? }` when `orderBy=field`
 * - `return` — `all`, `ids`, `titles`, `count`, `idParent`, `idSlug`, `idTitle`
 *
 * `count` is the number of published entries in public collections.
 */
export default defineEventHandler(async (event): Promise<QueryTermsResult> => {
  const query = getQuery(event) as Record<string, unknown>
  const requested = readStringList(query.dictionary)
  if (requested.length === 0) {
    fail(400, 'Missing dictionary.')
  }

  const dictionaries = resolveDictionaries(requested, getDictionaries())
  const orderByRaw = firstQueryValue(query.orderBy)
  const orderByToken = typeof orderByRaw === 'string' ? orderByRaw.trim() : ''
  const orderBy = isTermOrderBy(orderByToken) ? orderByToken : undefined
  const orderRaw = firstQueryValue(query.order)
  const orderToken = typeof orderRaw === 'string' ? orderRaw.trim().toLowerCase() : ''
  const order = orderToken === 'asc' || orderToken === 'desc' ? orderToken : undefined
  const returnRaw = firstQueryValue(query.return)
  const returnToken = typeof returnRaw === 'string' ? returnRaw.trim() : ''
  const returnMode = isTermsReturn(returnToken) ? returnToken : undefined

  const filters: QueryTermsOptions = {
    dictionaries,
    perPage: readPerPage(query.perPage, UNLIMITED_COLLECTION_PER_PAGE),
    offset: readOffset(query.offset),
    hideEmpty: readBool(query.hideEmpty, true),
    hierarchical: readBool(query.hierarchical, true),
    padCounts: readBool(query.padCounts, false),
    childless: readBool(query.childless, false),
    countTypes: publicCollectionSlugs(getCollections()),
    search: typeof firstQueryValue(query.search) === 'string'
      ? String(firstQueryValue(query.search))
      : undefined,
  }
  if (orderBy) {
    filters.orderBy = orderBy
  }
  if (order) {
    filters.order = order
  }
  if (returnMode) {
    filters.return = returnMode
  }
  if (hasQueryParam(query, 'includeIds')) {
    filters.includeIds = readIdList(query.includeIds)
  }
  if (hasQueryParam(query, 'excludeIds')) {
    filters.excludeIds = readIdList(query.excludeIds)
  }
  if (hasQueryParam(query, 'excludeTreeIds')) {
    filters.excludeTreeIds = readIdList(query.excludeTreeIds)
  }
  if (hasQueryParam(query, 'slug')) {
    filters.slug = readStringList(query.slug)
  }
  if (hasQueryParam(query, 'title')) {
    filters.title = readStringList(query.title)
  }
  if (hasQueryParam(query, 'parentId')) {
    filters.parentId = readParentId(query.parentId)
  }
  if (hasQueryParam(query, 'childOf')) {
    filters.childOf = readChildOf(query.childOf)
  }
  if (hasQueryParam(query, 'fieldsQuery')) {
    filters.fieldsQuery = readFieldsQuery(query.fieldsQuery)
  }
  if (orderBy === 'field') {
    filters.orderByField = readOrderByField(query.orderByField)
  }

  return queryTerms(getDb(), filters)
})
