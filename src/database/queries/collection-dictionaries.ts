import type { Kysely, Selectable } from 'kysely'
import type { CollectionDictionariesTable, Database } from '../client/schema'
import type { Collection } from './collections'
import type { Dictionary } from './dictionaries'

export type CollectionDictionary = Selectable<CollectionDictionariesTable>

export async function listDictionariesByCollection(
  db: Kysely<Database>,
  collectionId: number,
): Promise<Dictionary[]> {
  return db
    .selectFrom('collection_dictionaries')
    .innerJoin('dictionaries', 'dictionaries.id', 'collection_dictionaries.dictionary_id')
    .selectAll('dictionaries')
    .where('collection_dictionaries.collection_id', '=', collectionId)
    .orderBy('dictionaries.type', 'asc')
    .orderBy('dictionaries.title', 'asc')
    .orderBy('dictionaries.id', 'asc')
    .execute()
}

export async function listCollectionsByDictionary(
  db: Kysely<Database>,
  dictionaryId: number,
): Promise<Collection[]> {
  return db
    .selectFrom('collection_dictionaries')
    .innerJoin('collections', 'collections.id', 'collection_dictionaries.collection_id')
    .selectAll('collections')
    .where('collection_dictionaries.dictionary_id', '=', dictionaryId)
    .orderBy('collections.menu_order', 'asc')
    .orderBy('collections.created_at', 'desc')
    .execute()
}

export async function linkCollectionDictionary(
  db: Kysely<Database>,
  collectionId: number,
  dictionaryId: number,
): Promise<CollectionDictionary> {
  const inserted = await db
    .insertInto('collection_dictionaries')
    .values({ collection_id: collectionId, dictionary_id: dictionaryId })
    .onConflict(oc => oc
      .columns(['collection_id', 'dictionary_id'])
      .doNothing(),
    )
    .returningAll()
    .executeTakeFirst()
  if (inserted) {
    return inserted
  }
  return db
    .selectFrom('collection_dictionaries')
    .selectAll()
    .where('collection_id', '=', collectionId)
    .where('dictionary_id', '=', dictionaryId)
    .executeTakeFirstOrThrow()
}

export async function unlinkCollectionDictionary(
  db: Kysely<Database>,
  collectionId: number,
  dictionaryId: number,
): Promise<boolean> {
  const result = await db
    .deleteFrom('collection_dictionaries')
    .where('collection_id', '=', collectionId)
    .where('dictionary_id', '=', dictionaryId)
    .executeTakeFirst()
  return result.numDeletedRows > 0n
}
