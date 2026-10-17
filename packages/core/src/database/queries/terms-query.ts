import type { Kysely } from 'kysely'
import type { Database } from '../client/schema'
import { applyFieldsQueryFilters } from './fields-query'
import type { FieldsQuery, FieldsQueryCast } from './fields-query'
import type { Dictionary } from './dictionaries'

export const TERM_ORDER_FIELDS = [
  'id',
  'title',
  'slug',
  'count',
  'parent',
  'includeIds',
  'slugs',
  'field',
  'none',
] as const

export type TermOrderBy = typeof TERM_ORDER_FIELDS[number]

export const TERMS_RETURNS = [
  'all',
  'ids',
  'titles',
  'count',
  'idParent',
  'idSlug',
  'idTitle',
] as const

export type TermsReturn = typeof TERMS_RETURNS[number]

export interface TermOrderField {
  key: string
  type?: FieldsQueryCast
}

export interface QueryTermsOptions {
  /** Dictionary slugs (`dictionaries.type`). */
  dictionaries: string[]
  /**
   * Page size. Omitted or `-1` returns every match.
   * Applied after filters, together with `offset`.
   */
  perPage?: number
  /** How many matches to skip. Default: `0`. */
  offset?: number
  /** Only these term ids. An empty list matches nothing. */
  includeIds?: number | number[]
  /** Skip these term ids. */
  excludeIds?: number | number[]
  /** Skip these terms and every descendant. */
  excludeTreeIds?: number | number[]
  /** Direct parent. `null` / `0` is top-level. */
  parentId?: number | null
  /** Every descendant of this term. The term itself is not included. */
  childOf?: number
  /** Skip terms that have children. Default: `false`. */
  childless?: boolean
  /** Exact slug(s). An empty list matches nothing. */
  slug?: string | string[]
  /** Exact title(s). An empty list matches nothing. */
  title?: string | string[]
  /** Case-insensitive substring of title or slug. */
  search?: string
  /**
   * Hide terms with no published entries.
   * Default: `true`.
   */
  hideEmpty?: boolean
  /**
   * When `hideEmpty` is set, keep an empty term if a descendant has entries.
   * Default: `true`.
   */
  hierarchical?: boolean
  /**
   * Add descendant entry counts to each term's `count`.
   * Default: `false`.
   */
  padCounts?: boolean
  /** Filter `dictionaries.fields`. */
  fieldsQuery?: FieldsQuery
  /** Default: `title`. */
  orderBy?: TermOrderBy
  /** Key used when `orderBy` is `field`. */
  orderByField?: TermOrderField
  /** Default: `asc`. */
  order?: 'asc' | 'desc'
  /**
   * Collection types whose published entries count.
   * Omitted counts every published entry. An empty list counts nothing.
   */
  countTypes?: string[]
  /** Default: `all`. `count` ignores `perPage` and `offset`. */
  return?: TermsReturn
}

export interface QueryTerm {
  id: number
  type: string
  slug: string
  slugPath: string
  title: string
  fields: Record<string, unknown>
  parentId: number | null
  count: number
}

export interface QueryTermsResult {
  total: number
  terms: QueryTerm[]
  ids: number[]
  titles: string[]
  map: Record<string, number | string | null>
}

const CASTS = new Set<string>(['TEXT', 'INTEGER', 'NUMERIC', 'DATETIME', 'DATE', 'TIME'])

export function isTermOrderBy(value: string): value is TermOrderBy {
  return (TERM_ORDER_FIELDS as readonly string[]).includes(value)
}

export function isTermsReturn(value: string): value is TermsReturn {
  return (TERMS_RETURNS as readonly string[]).includes(value)
}

interface IdList {
  specified: boolean
  ids: number[]
}

interface StringList {
  specified: boolean
  values: string[]
}

function asIdList(value: number | number[] | undefined): IdList {
  if (value === undefined) {
    return { specified: false, ids: [] }
  }
  const raw = Array.isArray(value) ? value : [value]
  const ids: number[] = []
  const seen = new Set<number>()
  for (const item of raw) {
    if (!Number.isInteger(item) || item < 1 || seen.has(item)) {
      continue
    }
    seen.add(item)
    ids.push(item)
  }
  return { specified: true, ids }
}

function asStringList(value: string | string[] | undefined): StringList {
  if (value === undefined) {
    return { specified: false, values: [] }
  }
  const raw = Array.isArray(value) ? value : [value]
  return {
    specified: true,
    values: [...new Set(raw.map(item => item.trim()).filter(Boolean))],
  }
}

function asFields(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function normalizeCast(value: unknown): FieldsQueryCast {
  const token = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return CASTS.has(token) ? token as FieldsQueryCast : 'TEXT'
}

function childrenOf(rows: Dictionary[]): Map<number, number[]> {
  const children = new Map<number, number[]>()
  for (const row of rows) {
    if (row.parent_id == null) {
      continue
    }
    const list = children.get(row.parent_id) ?? []
    list.push(row.id)
    children.set(row.parent_id, list)
  }
  return children
}

function descendantIds(id: number, children: Map<number, number[]>): number[] {
  const out: number[] = []
  const seen = new Set<number>()
  const walk = (current: number) => {
    for (const childId of children.get(current) ?? []) {
      if (seen.has(childId)) {
        continue
      }
      seen.add(childId)
      out.push(childId)
      walk(childId)
    }
  }
  walk(id)
  return out
}

function hasFilledDescendant(
  id: number,
  children: Map<number, number[]>,
  direct: Map<number, number>,
  seen = new Set<number>(),
): boolean {
  if (seen.has(id)) {
    return false
  }
  seen.add(id)
  for (const childId of children.get(id) ?? []) {
    if ((direct.get(childId) ?? 0) > 0) {
      return true
    }
    if (hasFilledDescendant(childId, children, direct, seen)) {
      return true
    }
  }
  return false
}

function paddedCount(
  id: number,
  children: Map<number, number[]>,
  direct: Map<number, number>,
  memo: Map<number, number>,
  seen = new Set<number>(),
): number {
  const cached = memo.get(id)
  if (cached != null) {
    return cached
  }
  if (seen.has(id)) {
    return direct.get(id) ?? 0
  }
  seen.add(id)
  let sum = direct.get(id) ?? 0
  for (const childId of children.get(id) ?? []) {
    sum += paddedCount(childId, children, direct, memo, seen)
  }
  memo.set(id, sum)
  return sum
}

function slugPath(row: Dictionary, byId: Map<number, Dictionary>): string {
  const parts: string[] = []
  const seen = new Set<number>()
  let current: Dictionary | undefined = row
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    parts.push(current.slug)
    current = current.parent_id != null ? byId.get(current.parent_id) : undefined
  }
  return parts.reverse().join('/')
}

function readPath(fields: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.').map(part => part.trim()).filter(Boolean)
  let current: unknown = fields
  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function fieldToken(value: unknown, type: FieldsQueryCast): string | number | null {
  if (value == null || value === '') {
    return null
  }
  if (type === 'INTEGER' || type === 'NUMERIC') {
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? n : null
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function compareSortable(
  left: string | number | null,
  right: string | number | null,
  direction: 'asc' | 'desc',
): number {
  if (left == null || right == null) {
    if (left == null && right == null) {
      return 0
    }
    return left == null ? 1 : -1
  }
  let result = 0
  if (left < right) {
    result = -1
  }
  else if (left > right) {
    result = 1
  }
  return direction === 'desc' ? -result : result
}

function searchHit(row: Dictionary, needle: string): boolean {
  const haystack = `${row.title}\n${row.slug}`.toLowerCase()
  return haystack.includes(needle)
}

function limitOf(perPage: number | undefined): number | null {
  if (perPage == null || perPage === -1) {
    return null
  }
  if (!Number.isInteger(perPage) || perPage < 1) {
    return null
  }
  return perPage
}

async function loadCounts(
  db: Kysely<Database>,
  ids: number[],
  countTypes: string[] | undefined,
): Promise<Map<number, number>> {
  const counts = new Map<number, number>()
  if (ids.length === 0 || (countTypes != null && countTypes.length === 0)) {
    return counts
  }
  let query = db
    .selectFrom('collection_dictionaries')
    .innerJoin('collections', 'collections.id', 'collection_dictionaries.collection_id')
    .select('collection_dictionaries.dictionary_id')
    .select(eb => eb.fn.countAll<number>().as('total'))
    .where('collections.status', '=', 'published')
    .where('collection_dictionaries.dictionary_id', 'in', ids)
    .groupBy('collection_dictionaries.dictionary_id')
  if (countTypes) {
    query = query.where('collections.type', 'in', countTypes)
  }
  const rows = await query.execute()
  for (const row of rows) {
    counts.set(row.dictionary_id, Number(row.total) || 0)
  }
  return counts
}

function project(rows: QueryTerm[], mode: TermsReturn, total: number): QueryTermsResult {
  if (mode === 'count') {
    return { total, terms: [], ids: [], titles: [], map: {} }
  }
  if (mode === 'ids') {
    return { total, terms: [], ids: rows.map(row => row.id), titles: [], map: {} }
  }
  if (mode === 'titles') {
    return { total, terms: [], ids: [], titles: rows.map(row => row.title), map: {} }
  }
  if (mode === 'idParent' || mode === 'idSlug' || mode === 'idTitle') {
    const map: Record<string, number | string | null> = {}
    for (const row of rows) {
      if (mode === 'idParent') {
        map[String(row.id)] = row.parentId
      }
      else if (mode === 'idSlug') {
        map[String(row.id)] = row.slug
      }
      else {
        map[String(row.id)] = row.title
      }
    }
    return { total, terms: [], ids: [], titles: [], map }
  }
  return { total, terms: rows, ids: [], titles: [], map: {} }
}

/** List dictionary rows (`dictionaries`) with tree and entry-count filters. */
export async function queryTerms(
  db: Kysely<Database>,
  options: QueryTermsOptions,
): Promise<QueryTermsResult> {
  const empty: QueryTermsResult = { total: 0, terms: [], ids: [], titles: [], map: {} }
  const types = [...new Set(options.dictionaries.map(type => type.trim()).filter(Boolean))]
  if (types.length === 0) {
    return empty
  }

  const rows = await db
    .selectFrom('dictionaries')
    .selectAll()
    .where('type', 'in', types)
    .orderBy('id', 'asc')
    .execute()
  if (rows.length === 0) {
    return empty
  }

  let allowed: Set<number> | null = null
  if (options.fieldsQuery) {
    let idQuery = db
      .selectFrom('dictionaries')
      .select('id')
      .where('type', 'in', types)
    idQuery = applyFieldsQueryFilters(db, idQuery, options.fieldsQuery)
    allowed = new Set((await idQuery.execute()).map(row => row.id))
  }

  const byId = new Map(rows.map(row => [row.id, row]))
  const children = childrenOf(rows)
  const countTypes = options.countTypes == null
    ? undefined
    : options.countTypes.map(type => type.trim()).filter(Boolean)
  const direct = await loadCounts(db, rows.map(row => row.id), countTypes)
  const hideEmpty = options.hideEmpty !== false
  const hierarchical = options.hierarchical !== false
  const padCounts = options.padCounts === true
  const padded = new Map<number, number>()

  const include = asIdList(options.includeIds)
  const exclude = asIdList(options.excludeIds)
  const excludeTree = asIdList(options.excludeTreeIds)
  const slugs = asStringList(options.slug)
  const titles = asStringList(options.title)
  const includeSet = new Set(include.ids)
  const excludeSet = new Set(exclude.ids)
  const treeExcluded = new Set<number>()
  for (const id of excludeTree.ids) {
    treeExcluded.add(id)
    for (const childId of descendantIds(id, children)) {
      treeExcluded.add(childId)
    }
  }
  const slugSet = new Set(slugs.values)
  const titleSet = new Set(titles.values)
  const needle = options.search?.trim().toLowerCase() ?? ''
  const childOf = Number.isInteger(options.childOf) && (options.childOf ?? 0) > 0
    ? options.childOf!
    : undefined
  const childOfSet = childOf == null ? null : new Set(descendantIds(childOf, children))
  const parentSpecified = options.parentId !== undefined
  const parentId = options.parentId == null || options.parentId === 0
    ? null
    : Number.isInteger(options.parentId) && options.parentId > 0
      ? options.parentId
      : Number.NaN

  const matched = rows.filter((row) => {
    if (allowed && !allowed.has(row.id)) {
      return false
    }
    if (needle && !searchHit(row, needle)) {
      return false
    }
    if (titles.specified && !titleSet.has(row.title)) {
      return false
    }
    if (slugs.specified && !slugSet.has(row.slug)) {
      return false
    }
    if (include.specified && !includeSet.has(row.id)) {
      return false
    }
    if (excludeSet.has(row.id) || treeExcluded.has(row.id)) {
      return false
    }
    if (childOfSet && !childOfSet.has(row.id)) {
      return false
    }
    if (parentSpecified) {
      if (Number.isNaN(parentId)) {
        return false
      }
      if ((row.parent_id ?? null) !== parentId) {
        return false
      }
    }
    if (options.childless && (children.get(row.id)?.length ?? 0) > 0) {
      return false
    }
    const own = direct.get(row.id) ?? 0
    if (hideEmpty && own < 1) {
      if (!hierarchical || !hasFilledDescendant(row.id, children, direct)) {
        return false
      }
    }
    return true
  })

  const orderBy = options.orderBy && isTermOrderBy(options.orderBy) ? options.orderBy : 'title'
  const direction = options.order === 'desc' ? 'desc' : 'asc'
  const fieldKey = options.orderByField?.key.trim() ?? ''
  const fieldType = normalizeCast(options.orderByField?.type)
  const slugOrder = new Map(slugs.values.map((slug, index) => [slug, index]))
  const includeOrder = new Map(include.ids.map((id, index) => [id, index]))

  const terms: QueryTerm[] = matched.map((row) => {
    const own = direct.get(row.id) ?? 0
    const count = padCounts ? paddedCount(row.id, children, direct, padded) : own
    return {
      id: row.id,
      type: row.type,
      slug: row.slug,
      slugPath: slugPath(row, byId),
      title: row.title,
      fields: asFields(row.fields),
      parentId: row.parent_id,
      count,
    }
  })

  const effectiveOrder = orderBy === 'field' && !fieldKey
    ? 'title'
    : orderBy === 'includeIds' && !include.specified
      ? 'title'
      : orderBy === 'slugs' && !slugs.specified
        ? 'title'
        : orderBy

  function primaryOrder(left: QueryTerm, right: QueryTerm): number {
    if (effectiveOrder === 'id') {
      return compareSortable(left.id, right.id, direction)
    }
    if (effectiveOrder === 'slug') {
      return compareSortable(left.slug, right.slug, direction)
    }
    if (effectiveOrder === 'count') {
      return compareSortable(left.count, right.count, direction)
    }
    if (effectiveOrder === 'parent') {
      return compareSortable(left.parentId ?? 0, right.parentId ?? 0, direction)
    }
    if (effectiveOrder === 'includeIds') {
      return compareSortable(
        includeOrder.get(left.id) ?? include.ids.length,
        includeOrder.get(right.id) ?? include.ids.length,
        direction,
      )
    }
    if (effectiveOrder === 'slugs') {
      return compareSortable(
        slugOrder.get(left.slug) ?? slugs.values.length,
        slugOrder.get(right.slug) ?? slugs.values.length,
        direction,
      )
    }
    if (effectiveOrder === 'field') {
      return compareSortable(
        fieldToken(readPath(left.fields, fieldKey), fieldType),
        fieldToken(readPath(right.fields, fieldKey), fieldType),
        direction,
      )
    }
    return compareSortable(left.title, right.title, direction)
  }

  if (effectiveOrder !== 'none') {
    terms.sort((left, right) => {
      const result = primaryOrder(left, right)
      if (result !== 0 || effectiveOrder === 'id') {
        return result
      }
      return left.id - right.id
    })
  }

  const total = terms.length
  const mode = options.return && isTermsReturn(options.return) ? options.return : 'all'
  if (mode === 'count') {
    return project(terms, mode, total)
  }
  const offset = Number.isInteger(options.offset) && (options.offset ?? 0) > 0 ? options.offset! : 0
  const limit = limitOf(options.perPage)
  const page = limit == null ? terms.slice(offset) : terms.slice(offset, offset + limit)
  return project(page, mode, total)
}
