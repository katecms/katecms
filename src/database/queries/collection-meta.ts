import type { Kysely, Selectable } from 'kysely'
import type { CollectionMetaTable, Database } from '../client/schema'

export type CollectionMeta = Selectable<CollectionMetaTable>

export async function listCollectionMeta(
  db: Kysely<Database>,
  collectionId: number,
): Promise<CollectionMeta[]> {
  return db
    .selectFrom('collection_meta')
    .selectAll()
    .where('collection_id', '=', collectionId)
    .orderBy('key', 'asc')
    .execute()
}

export async function findCollectionMeta(
  db: Kysely<Database>,
  collectionId: number,
  key: string,
): Promise<CollectionMeta | undefined> {
  const normalized = key.trim()
  if (!normalized) {
    return undefined
  }
  return db
    .selectFrom('collection_meta')
    .selectAll()
    .where('collection_id', '=', collectionId)
    .where('key', '=', normalized)
    .executeTakeFirst()
}

export async function setCollectionMeta(
  db: Kysely<Database>,
  collectionId: number,
  key: string,
  value: unknown | null,
): Promise<CollectionMeta> {
  const normalized = key.trim()
  if (!normalized) {
    throw new Error('[MiraiCMS] collection meta key must be non-empty.')
  }
  return db
    .insertInto('collection_meta')
    .values({ collection_id: collectionId, key: normalized, value })
    .onConflict(oc => oc
      .columns(['collection_id', 'key'])
      .doUpdateSet({ value }),
    )
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function deleteCollectionMeta(
  db: Kysely<Database>,
  collectionId: number,
  key: string,
): Promise<boolean> {
  const normalized = key.trim()
  if (!normalized) {
    return false
  }
  const result = await db
    .deleteFrom('collection_meta')
    .where('collection_id', '=', collectionId)
    .where('key', '=', normalized)
    .executeTakeFirst()
  return (result.numDeletedRows ?? 0n) > 0n
}
