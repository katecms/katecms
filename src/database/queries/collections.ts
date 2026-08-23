import type { Insertable, Kysely, Selectable, Updateable } from 'kysely'
import type { Database, CollectionsTable } from '../client/schema'

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
}>(values: T): T {
  if (values.status === 'published' && (values.published_at == null)) {
    return { ...values, published_at: new Date() }
  }
  return values
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
): Promise<Collection[]> {
  return db
    .selectFrom('collections')
    .selectAll()
    .where('type', '=', type)
    .where('status', '!=', 'trash')
    .orderBy('menu_order', 'asc')
    .orderBy('created_at', 'desc')
    .execute()
}

export async function createCollection(
  db: Kysely<Database>,
  values: NewCollection,
): Promise<Collection> {
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
  const patch = withPublishedAt(definedValues({
    ...rest,
    ...rest.slug !== undefined ? { slug: rest.slug.trim() } : {},
    ...rest.title !== undefined ? { title: rest.title.trim() } : {},
  }))
  if (Object.keys(patch).length === 0) {
    return findCollectionById(db, id)
  }
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
