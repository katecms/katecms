import type { Insertable, Kysely, RawBuilder, Selectable, SelectQueryBuilder, SqlBool, Updateable } from 'kysely'
import { sql } from 'kysely'
import type { CollectionStatus, Database, CollectionsTable } from '../client/schema'
import { buildSlugPathMap } from '../../rewrite'
import { applyListPaging } from './paging'
import type { ListPaging } from './paging'
import { applyDictionaryQueryFilters } from './dictionary-query'
import type { DictionaryQuery } from './dictionary-query'
import { applyFieldsQueryFilters } from './fields-query'
import type { FieldsQuery } from './fields-query'

export type Collection = Selectable<CollectionsTable>
export type NewCollection = Insertable<CollectionsTable>
export type CollectionUpdate = Updateable<CollectionsTable>

function definedValues<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}

function withPublishedAt<T extends {
  status?: string
  published_at?: Date | string | null
}>(values: T, existingPublishedAt?: Date | string | null): T {
  if (values.status !== 'published' || values.published_at != null) {
    return values
  }
  if (existingPublishedAt != null) {
    return values
  }
  return { ...values, published_at: new Date() }
}

export async function findCollectionById(
  db: Kysely<Database>,
  id: number,
): Promise<Collection | undefined> {
  return db
    .selectFrom('collections')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

/**
 * `active` (default) is published + draft. `all` includes trash.
 * A concrete {@link CollectionStatus} lists only that status.
 */
export type CollectionListStatus = CollectionStatus | 'active' | 'all'

export const COLLECTION_LIST_SORTS = [
  'date-desc',
  'date-asc',
  'author-asc',
  'author-desc',
  'title-asc',
  'title-desc',
] as const

/** Admin list order. Omitted keeps menu order, then newest `created_at`. */
export type CollectionListSort = typeof COLLECTION_LIST_SORTS[number]

export interface ListCollectionsOptions extends ListPaging {
  status?: CollectionListStatus
  /** Case-insensitive match on title or slug (max 200 chars; `%`/`_` stripped). */
  search?: string
  /** `YYYY-MM` of the date shown in the admin list, in the viewer's timezone. */
  month?: string
  /** Minutes to add to UTC to get that local time. */
  offsetMinutes?: number
  sort?: CollectionListSort
}

export interface CollectionStatusCounts {
  /** Published + draft (excludes trash). */
  all: number
  published: number
  draft: number
  trash: number
}

function searchPattern(search: string | undefined): string | null {
  const trimmed = search?.trim().slice(0, 200) ?? ''
  if (!trimmed) {
    return null
  }
  const escaped = trimmed.replace(/[%_]/g, '').toLowerCase()
  return escaped ? `%${escaped}%` : null
}

function isPostgres(db: Kysely<Database>): boolean {
  return db.getExecutor().adapter.constructor.name === 'PostgresAdapter'
}

function clampOffsetMinutes(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 0
  }
  return Math.max(-14 * 60, Math.min(14 * 60, Math.trunc(value)))
}

/**
 * Timestamp shown in the admin date column: published time, unless the entry
 * was modified more than two seconds later (then the modification time).
 */
function collectionListInstant(postgres: boolean): RawBuilder<Date | string> {
  if (postgres) {
    return sql<Date>`CASE
      WHEN collections.status = 'published'
        AND collections.published_at IS NOT NULL
        AND (
          collections.updated_at IS NULL
          OR collections.updated_at <= collections.published_at + interval '2 seconds'
        )
      THEN collections.published_at
      ELSE COALESCE(collections.updated_at, collections.published_at, collections.created_at)
    END`
  }
  return sql<string>`CASE
    WHEN collections.status = 'published'
      AND collections.published_at IS NOT NULL
      AND (
        collections.updated_at IS NULL
        OR strftime('%s', substr(replace(replace(collections.updated_at, 'T', ' '), 'Z', ''), 1, 19))
           <= strftime('%s', substr(replace(replace(collections.published_at, 'T', ' '), 'Z', ''), 1, 19)) + 2
      )
    THEN collections.published_at
    ELSE COALESCE(collections.updated_at, collections.published_at, collections.created_at)
  END`
}

function collectionListMonth(postgres: boolean, offsetMinutes: number): RawBuilder<string> {
  const instant = collectionListInstant(postgres)
  const offset = clampOffsetMinutes(offsetMinutes)
  if (postgres) {
    return sql<string>`to_char((${instant} AT TIME ZONE 'UTC') + (${offset} * interval '1 minute'), 'YYYY-MM')`
  }
  const modifier = `${offset >= 0 ? '+' : ''}${offset} minutes`
  return sql<string>`substr(datetime(substr(replace(replace(${instant}, 'T', ' '), 'Z', ''), 1, 19), ${modifier}), 1, 7)`
}

function withCollectionListFilters<O>(
  query: SelectQueryBuilder<Database, 'collections', O>,
  type: string,
  options?: ListCollectionsOptions,
  postgres = false,
): SelectQueryBuilder<Database, 'collections', O> {
  let next = query.where('type', '=', type)
  const status = options?.status ?? 'active'
  if (status === 'active') {
    next = next.where('status', '!=', 'trash')
  }
  else if (status !== 'all') {
    next = next.where('status', '=', status)
  }
  const pattern = searchPattern(options?.search)
  if (pattern) {
    next = next.where(sql<SqlBool>`(lower(collections.title) like ${pattern} or lower(collections.slug) like ${pattern})`)
  }
  if (options?.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(options.month)) {
    const month = collectionListMonth(postgres, options.offsetMinutes ?? 0)
    next = next.where(sql<SqlBool>`${month} = ${options.month}`)
  }
  return next
}

function applyCollectionListOrder<O>(
  query: SelectQueryBuilder<Database, 'collections', O>,
  options: ListCollectionsOptions | undefined,
  postgres: boolean,
): SelectQueryBuilder<Database, 'collections', O> {
  const sort = options?.sort
  if (!sort || !COLLECTION_LIST_SORTS.includes(sort)) {
    return query
      .orderBy('menu_order', 'asc')
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
  }
  const direction = sort.endsWith('-asc') ? 'asc' : 'desc'
  const field = sort.slice(0, -(direction.length + 1))
  if (field === 'title') {
    return query.orderBy(sql`lower(collections.title)`, direction).orderBy('id', 'asc')
  }
  if (field === 'author') {
    const author = sql`(select lower(coalesce(nullif(trim(users.name), ''), users.email)) from users where users.id = collections.author_id)`
    return query
      .orderBy(sql`${author} is null`)
      .orderBy(author, direction)
      .orderBy('id', 'asc')
  }
  return query
    .orderBy(collectionListInstant(postgres), direction)
    .orderBy('id', direction)
}

export async function listCollections(
  db: Kysely<Database>,
  type: string,
  options?: ListCollectionsOptions,
): Promise<Collection[]> {
  const postgres = isPostgres(db)
  const query = applyCollectionListOrder(
    withCollectionListFilters(
      db.selectFrom('collections').selectAll(),
      type,
      options,
      postgres,
    ),
    options,
    postgres,
  )
  return applyListPaging(query, options).execute()
}

export async function countCollections(
  db: Kysely<Database>,
  type: string,
  options?: Omit<ListCollectionsOptions, keyof ListPaging>,
): Promise<number> {
  const postgres = isPostgres(db)
  const row = await withCollectionListFilters(
    db.selectFrom('collections').select(eb => eb.fn.countAll<number>().as('n')),
    type,
    options,
    postgres,
  ).executeTakeFirstOrThrow()
  return Number(row.n)
}

/** Months (`YYYY-MM`) that contain entries for the same status and search, ignoring `month`. */
export async function listCollectionMonths(
  db: Kysely<Database>,
  type: string,
  options?: Omit<ListCollectionsOptions, keyof ListPaging | 'month' | 'sort'>,
): Promise<string[]> {
  const postgres = isPostgres(db)
  const month = collectionListMonth(postgres, options?.offsetMinutes ?? 0)
  const rows = await withCollectionListFilters(
    db.selectFrom('collections'),
    type,
    options,
    postgres,
  )
    .select(month.as('month'))
    .distinct()
    .execute()

  return rows
    .map(row => String(row.month ?? ''))
    .filter(value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    .sort((a, b) => b.localeCompare(a))
}

const COLLECTION_ORDER_FIELDS = [
  'menu_order',
  'created_at',
  'updated_at',
  'published_at',
  'title',
  'slug',
  'id',
] as const

export type CollectionOrderField = typeof COLLECTION_ORDER_FIELDS[number]
export type CollectionQueryOrderBy = CollectionOrderField | 'includeIds'

export function isCollectionOrderField(value: string): value is CollectionOrderField {
  return (COLLECTION_ORDER_FIELDS as readonly string[]).includes(value)
}

export function isCollectionQueryOrderBy(value: string): value is CollectionQueryOrderBy {
  return value === 'includeIds' || isCollectionOrderField(value)
}

export interface QueryCollectionsOptions extends ListPaging {
  types: string[]
  statuses?: CollectionStatus[]
  search?: string
  title?: string | string[]
  includeIds?: number | number[]
  excludeIds?: number | number[]
  parentId?: number | null
  parentIds?: number | number[]
  excludeParentIds?: number | number[]
  slugs?: string | string[]
  authorIn?: number | number[]
  authorNotIn?: number | number[]
  slug?: string | string[]
  dictionaryQuery?: DictionaryQuery
  fieldsQuery?: FieldsQuery
  orderBy?: CollectionQueryOrderBy
  order?: 'asc' | 'desc'
}

function asIdList(value: number | number[] | undefined): number[] {
  if (value == null) {
    return []
  }
  const raw = Array.isArray(value) ? value : [value]
  return uniqueIds(raw.filter(id => Number.isInteger(id) && id > 0))
}

function uniqueIds(ids: number[]): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const id of ids) {
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    out.push(id)
  }
  return out
}

function asSlugList(value: string | string[] | undefined): string[] {
  if (value == null) {
    return []
  }
  const raw = Array.isArray(value) ? value : [value]
  return [...new Set(raw.map(item => item.trim()).filter(Boolean))]
}

interface ParentIdFilter {
  specified: boolean
  ids: number[]
  includeRoot: boolean
}

function pushParentIdValues(
  value: number | number[] | null | undefined,
  into: { ids: number[], includeRoot: boolean, seen: Set<number> },
) {
  if (value === undefined) {
    return
  }
  const raw: Array<number | null> = value === null
    ? [null]
    : Array.isArray(value)
      ? value
      : [value]
  for (const item of raw) {
    if (item == null || item === 0) {
      into.includeRoot = true
      continue
    }
    if (!Number.isInteger(item) || item < 1 || into.seen.has(item)) {
      continue
    }
    into.seen.add(item)
    into.ids.push(item)
  }
}

function parentIdFilter(options: QueryCollectionsOptions): ParentIdFilter {
  const specified = options.parentId !== undefined
    || options.parentIds !== undefined
  if (!specified) {
    return { specified: false, ids: [], includeRoot: false }
  }
  const into = { ids: [] as number[], includeRoot: false, seen: new Set<number>() }
  pushParentIdValues(options.parentId, into)
  pushParentIdValues(options.parentIds, into)
  return { specified: true, ids: into.ids, includeRoot: into.includeRoot }
}

function excludeParentIdFilter(value: number | number[] | undefined): ParentIdFilter {
  if (value === undefined) {
    return { specified: false, ids: [], includeRoot: false }
  }
  const into = { ids: [] as number[], includeRoot: false, seen: new Set<number>() }
  pushParentIdValues(value, into)
  return { specified: true, ids: into.ids, includeRoot: into.includeRoot }
}

function includeIdsOrderExpression(ids: number[]) {
  return sql`case ${sql.join(
    ids.map((id, index) => sql`when ${sql.ref('id')} = ${id} then ${index}`),
    sql` `,
  )} else ${ids.length} end`
}

function withCollectionQueryFilters<O>(
  query: SelectQueryBuilder<Database, 'collections', O>,
  options: QueryCollectionsOptions,
): SelectQueryBuilder<Database, 'collections', O> {
  const types = [...new Set(options.types.map(type => type.trim()).filter(Boolean))]
  let next = types.length === 1
    ? query.where('type', '=', types[0]!)
    : query.where('type', 'in', types)

  const statuses = options.statuses?.filter(status => status === 'published' || status === 'draft' || status === 'trash')
  if (statuses && statuses.length > 0) {
    next = statuses.length === 1
      ? next.where('status', '=', statuses[0]!)
      : next.where('status', 'in', statuses)
  }
  else {
    next = next.where('status', '!=', 'trash')
  }

  const pattern = searchPattern(options.search)
  if (pattern) {
    next = next.where(sql<SqlBool>`(lower(title) like ${pattern} or lower(slug) like ${pattern})`)
  }

  const titles = asSlugList(options.title)
  if (options.title !== undefined) {
    next = titles.length === 1
      ? next.where('title', '=', titles[0]!)
      : next.where('title', 'in', titles.length > 0 ? titles : [''])
  }

  const include = asIdList(options.includeIds)
  if (options.includeIds !== undefined) {
    next = next.where('id', 'in', include.length > 0 ? include : [0])
  }
  const exclude = asIdList(options.excludeIds)
  if (exclude.length > 0) {
    next = next.where('id', 'not in', exclude)
  }

  const parents = parentIdFilter(options)
  if (parents.specified) {
    if (parents.ids.length === 0 && !parents.includeRoot) {
      next = next.where('id', 'in', [0])
    }
    else if (parents.ids.length > 0 && parents.includeRoot) {
      next = next.where(eb => eb.or([
        eb('parent_id', 'is', null),
        eb('parent_id', 'in', parents.ids),
      ]))
    }
    else if (parents.includeRoot) {
      next = next.where('parent_id', 'is', null)
    }
    else {
      next = next.where('parent_id', 'in', parents.ids)
    }
  }

  const excludedParents = excludeParentIdFilter(options.excludeParentIds)
  if (excludedParents.specified && (excludedParents.ids.length > 0 || excludedParents.includeRoot)) {
    if (excludedParents.includeRoot && excludedParents.ids.length === 0) {
      next = next.where('parent_id', 'is not', null)
    }
    else if (excludedParents.includeRoot) {
      next = next.where(eb => eb.and([
        eb('parent_id', 'is not', null),
        eb('parent_id', 'not in', excludedParents.ids),
      ]))
    }
    else {
      next = next.where(eb => eb.or([
        eb('parent_id', 'is', null),
        eb('parent_id', 'not in', excludedParents.ids),
      ]))
    }
  }

  const authorIn = asIdList(options.authorIn)
  if (options.authorIn !== undefined) {
    next = next.where('author_id', 'in', authorIn.length > 0 ? authorIn : [0])
  }
  const authorNotIn = asIdList(options.authorNotIn)
  if (authorNotIn.length > 0) {
    next = next.where('author_id', 'not in', authorNotIn)
  }

  const slugSpecified = options.slug !== undefined || options.slugs !== undefined
  const slugs = [...new Set([...asSlugList(options.slug), ...asSlugList(options.slugs)])]
  if (slugSpecified) {
    next = slugs.length === 1
      ? next.where('slug', '=', slugs[0]!)
      : next.where('slug', 'in', slugs.length > 0 ? slugs : [''])
  }

  return next
}

function applyCollectionOrder<O>(
  query: SelectQueryBuilder<Database, 'collections', O>,
  options: QueryCollectionsOptions,
): SelectQueryBuilder<Database, 'collections', O> {
  if (options.orderBy === 'includeIds') {
    const ids = asIdList(options.includeIds)
    if (ids.length > 0) {
      const direction = options.order === 'desc' ? 'desc' : 'asc'
      return query
        .orderBy(includeIdsOrderExpression(ids), direction)
        .orderBy('id', 'desc')
    }
  }
  const field = options.orderBy && isCollectionOrderField(options.orderBy)
    ? options.orderBy
    : 'menu_order'
  const direction = options.order === 'desc' || options.order === 'asc'
    ? options.order
    : field === 'menu_order' || field === 'title' || field === 'slug'
      ? 'asc'
      : 'desc'
  let next = query.orderBy(field, direction)
  if (field !== 'id') {
    next = next.orderBy('id', 'desc')
  }
  return next
}

/** Flexible list query on `collections`. */
export async function queryCollections(
  db: Kysely<Database>,
  options: QueryCollectionsOptions,
): Promise<Collection[]> {
  const types = [...new Set(options.types.map(type => type.trim()).filter(Boolean))]
  if (types.length === 0) {
    return []
  }
  const withDict = await applyDictionaryQueryFilters(
    db,
    withCollectionQueryFilters(
      db.selectFrom('collections').selectAll(),
      { ...options, types },
    ),
    options.dictionaryQuery,
  )
  const filtered = applyFieldsQueryFilters(db, withDict, options.fieldsQuery)
  const query = applyCollectionOrder(filtered, options)
  return applyListPaging(query, options).execute()
}

export async function countQueryCollections(
  db: Kysely<Database>,
  options: Omit<QueryCollectionsOptions, keyof ListPaging>,
): Promise<number> {
  const types = [...new Set(options.types.map(type => type.trim()).filter(Boolean))]
  if (types.length === 0) {
    return 0
  }
  const withDict = await applyDictionaryQueryFilters(
    db,
    withCollectionQueryFilters(
      db.selectFrom('collections').select(eb => eb.fn.countAll<number>().as('n')),
      { ...options, types },
    ),
    options.dictionaryQuery,
  )
  const filtered = applyFieldsQueryFilters(db, withDict, options.fieldsQuery)
  const row = await filtered.executeTakeFirstOrThrow()
  return Number(row.n)
}

/** Tab counts for the admin list. Search is not applied so numbers stay stable. */
export async function countCollectionStatuses(
  db: Kysely<Database>,
  type: string,
): Promise<CollectionStatusCounts> {
  const rows = await db
    .selectFrom('collections')
    .select(['status', eb => eb.fn.countAll<number>().as('n')])
    .where('type', '=', type)
    .groupBy('status')
    .execute()

  const counts: CollectionStatusCounts = {
    all: 0,
    published: 0,
    draft: 0,
    trash: 0,
  }
  for (const row of rows) {
    const n = Number(row.n)
    if (row.status === 'published' || row.status === 'draft' || row.status === 'trash') {
      counts[row.status] = n
    }
  }
  counts.all = counts.published + counts.draft
  return counts
}

export async function createCollection(
  db: Kysely<Database>,
  values: NewCollection,
): Promise<Collection> {
  const parentId = values.parent_id ?? null
  const check = await validateCollectionParent(db, values.type, parentId)
  if (!check.ok) {
    throw new Error(check.error)
  }
  const row = withPublishedAt({
    ...values,
    slug: values.slug.trim(),
    title: values.title.trim(),
  })
  return db
    .insertInto('collections')
    .values(row)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function updateCollection(
  db: Kysely<Database>,
  id: number,
  values: CollectionUpdate,
): Promise<Collection | undefined> {
  const { id: _id, ...rest } = values
  const defined = definedValues({
    ...rest,
    ...rest.slug !== undefined ? { slug: rest.slug.trim() } : {},
    ...rest.title !== undefined ? { title: rest.title.trim() } : {},
  })
  if (Object.keys(defined).length === 0) {
    return findCollectionById(db, id)
  }
  const current = await findCollectionById(db, id)
  if (!current) {
    return undefined
  }
  if (defined.parent_id !== undefined) {
    const check = await validateCollectionParent(
      db,
      defined.type ?? current.type,
      defined.parent_id ?? null,
      id,
    )
    if (!check.ok) {
      throw new Error(check.error)
    }
  }
  let existingPublishedAt: Date | string | null | undefined
  if (defined.status === 'published' && defined.published_at == null) {
    existingPublishedAt = current.published_at ?? null
  }
  const patch = withPublishedAt(defined, existingPublishedAt)
  return db
    .updateTable('collections')
    .set(patch)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export async function deleteCollection(
  db: Kysely<Database>,
  id: number,
): Promise<Collection | undefined> {
  return db
    .deleteFrom('collections')
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

/**
 * Permanently delete trashed entries of `type`.
 * Pass `ids` to limit the batch (e.g. only rows the actor may delete).
 */
export async function deleteTrashedCollections(
  db: Kysely<Database>,
  type: string,
  ids?: readonly number[],
): Promise<number> {
  if (ids && ids.length === 0) {
    return 0
  }
  let query = db
    .deleteFrom('collections')
    .where('type', '=', type)
    .where('status', '=', 'trash')
  if (ids) {
    query = query.where('id', 'in', [...ids])
  }
  const result = await query.executeTakeFirst()
  return Number(result.numDeletedRows ?? 0)
}

const DEFAULT_SLUG_PATH_STATUSES: CollectionStatus[] = ['published', 'draft']

/**
 * Walk `parent_id` from root to leaf and return the matching collection row.
 * `statuses` defaults to published + draft (admin/preview). Pass `['published']`
 * for a public-only lookup.
 */
export async function findCollectionBySlugPath(
  db: Kysely<Database>,
  type: string,
  segments: string[],
  statuses: CollectionStatus[] = DEFAULT_SLUG_PATH_STATUSES,
): Promise<Collection | undefined> {
  if (segments.length === 0 || statuses.length === 0) {
    return undefined
  }

  let parentId: number | null = null
  let row: Collection | undefined

  for (const segment of segments) {
    let query = db
      .selectFrom('collections')
      .selectAll()
      .where('type', '=', type)
      .where('slug', '=', segment)
      .where('status', 'in', statuses)

    query = parentId === null
      ? query.where('parent_id', 'is', null)
      : query.where('parent_id', '=', parentId)

    row = await query.executeTakeFirst()
    if (!row) {
      return undefined
    }
    parentId = row.id
  }

  return row
}

/** Hierarchical slug path for one collection entry (`parent/child`), or `''`. */
export async function loadCollectionSlugPath(
  db: Kysely<Database>,
  type: string,
  id: number,
): Promise<string> {
  const segments: string[] = []
  let currentId: number | null = id
  const seen = new Set<number>()
  while (currentId != null && !seen.has(currentId)) {
    seen.add(currentId)
    const row = await db
      .selectFrom('collections')
      .select(['slug', 'parent_id', 'type', 'status'])
      .where('id', '=', currentId)
      .executeTakeFirst()
    if (!row || row.type !== type || row.status === 'trash') {
      break
    }
    segments.unshift(row.slug)
    currentId = row.parent_id
  }
  return segments.join('/')
}

export interface CollectionParentOption {
  id: number
  title: string
  slug: string
  parentId: number | null
  slugPath: string
  depth: number
}

/**
 * Depth-first admin order: each parent, then its children, keeping sibling
 * order from `rows`. Entries whose parent is missing from the set are roots.
 */
export function flattenCollectionTree<T extends { id: number, parent_id: number | null }>(
  rows: T[],
): Array<{ row: T, depth: number }> {
  const ids = new Set(rows.map(row => row.id))
  const children = new Map<number | null, T[]>()

  for (const row of rows) {
    const parentKey = row.parent_id != null && ids.has(row.parent_id)
      ? row.parent_id
      : null
    const list = children.get(parentKey) ?? []
    list.push(row)
    children.set(parentKey, list)
  }

  const out: Array<{ row: T, depth: number }> = []
  const seen = new Set<number>()

  const walk = (parentId: number | null, depth: number) => {
    for (const row of children.get(parentId) ?? []) {
      if (seen.has(row.id)) {
        continue
      }
      seen.add(row.id)
      out.push({ row, depth })
      walk(row.id, depth + 1)
    }
  }

  walk(null, 0)

  for (const row of rows) {
    if (seen.has(row.id)) {
      continue
    }
    seen.add(row.id)
    out.push({ row, depth: 0 })
    walk(row.id, 1)
  }

  return out
}

/**
 * Parent picker rows for a hierarchical collection (excludes trash and,
 * optionally, an entry so it cannot parent itself).
 */
function descendantIds(
  rows: Array<{ id: number, parent_id: number | null }>,
  rootId: number,
): Set<number> {
  const children = new Map<number, number[]>()
  for (const row of rows) {
    if (row.parent_id == null) {
      continue
    }
    const list = children.get(row.parent_id) ?? []
    list.push(row.id)
    children.set(row.parent_id, list)
  }
  const out = new Set<number>()
  const stack = [...(children.get(rootId) ?? [])]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (out.has(id)) {
      continue
    }
    out.add(id)
    stack.push(...(children.get(id) ?? []))
  }
  return out
}

export async function listCollectionParentOptions(
  db: Kysely<Database>,
  type: string,
  excludeId?: number,
): Promise<CollectionParentOption[]> {
  const rows = await db
    .selectFrom('collections')
    .select(['id', 'title', 'slug', 'parent_id'])
    .where('type', '=', type)
    .where('status', '!=', 'trash')
    .orderBy('menu_order', 'asc')
    .orderBy('created_at', 'desc')
    .execute()

  const blocked = excludeId === undefined
    ? new Set<number>()
    : descendantIds(rows, excludeId)
  if (excludeId !== undefined) {
    blocked.add(excludeId)
  }

  const visible = rows.filter(row => !blocked.has(row.id))
  const paths = buildSlugPathMap(visible)
  return flattenCollectionTree(visible).map(({ row, depth }) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    parentId: row.parent_id,
    slugPath: paths.get(row.id) ?? row.slug,
    depth,
  }))
}

export type ValidateCollectionParentResult
  = | { ok: true }
    | { ok: false, error: string }

/**
 * Check that `parentId` belongs to the same collection type, is not trash,
 * is not the entry itself, and is not a descendant (cycle). HTTP mapping
 * stays in the adapter.
 */
export async function validateCollectionParent(
  db: Kysely<Database>,
  type: string,
  parentId: number | null,
  selfId?: number,
): Promise<ValidateCollectionParentResult> {
  if (parentId === null) {
    return { ok: true }
  }
  if (selfId !== undefined && parentId === selfId) {
    return { ok: false, error: 'An entry cannot be its own parent.' }
  }

  const parent = await db
    .selectFrom('collections')
    .select(['id', 'type', 'status', 'parent_id'])
    .where('id', '=', parentId)
    .executeTakeFirst()

  if (!parent || parent.type !== type || parent.status === 'trash') {
    return { ok: false, error: 'Parent entry not found.' }
  }

  if (selfId !== undefined) {
    let walkId: number | null = parentId
    const seen = new Set<number>()
    while (walkId != null && !seen.has(walkId)) {
      if (walkId === selfId) {
        return { ok: false, error: 'Cannot set a descendant as parent.' }
      }
      seen.add(walkId)
      const row = await db
        .selectFrom('collections')
        .select(['parent_id'])
        .where('id', '=', walkId)
        .executeTakeFirst()
      walkId = row?.parent_id ?? null
    }
  }

  return { ok: true }
}
