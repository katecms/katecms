import type { Insertable, Kysely, Selectable, Updateable } from 'kysely'
import type { CollectionStatus, Database, CollectionsTable } from '../client/schema'
import { buildSlugPathMap } from '../../rewrite'
import { applyListPaging } from './paging'
import type { ListPaging } from './paging'

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

export async function listCollections(
  db: Kysely<Database>,
  type: string,
  paging?: ListPaging,
): Promise<Collection[]> {
  const query = db
    .selectFrom('collections')
    .selectAll()
    .where('type', '=', type)
    .where('status', '!=', 'trash')
    .orderBy('menu_order', 'asc')
    .orderBy('created_at', 'desc')
  return applyListPaging(query, paging).execute()
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
    .orderBy('title', 'asc')
    .execute()

  const blocked = excludeId === undefined
    ? new Set<number>()
    : descendantIds(rows, excludeId)
  if (excludeId !== undefined) {
    blocked.add(excludeId)
  }

  const visible = rows.filter(row => !blocked.has(row.id))
  const paths = buildSlugPathMap(visible)
  return visible.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    parentId: row.parent_id,
    slugPath: paths.get(row.id) ?? row.slug,
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
