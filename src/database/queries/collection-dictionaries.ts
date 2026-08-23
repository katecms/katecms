import type { Kysely, Selectable, Transaction } from 'kysely'
import type { CollectionDictionariesTable, Database } from '../client/schema'
import type { Collection } from './collections'
import type { Dictionary } from './dictionaries'

export type CollectionDictionary = Selectable<CollectionDictionariesTable>

export interface ListCollectionsByDictionaryOptions {
  /** When true, include `status = 'trash'`. Default: hidden, like `listCollections`. */
  includeTrash?: boolean
}

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
  options?: ListCollectionsByDictionaryOptions,
): Promise<Collection[]> {
  let query = db
    .selectFrom('collection_dictionaries')
    .innerJoin('collections', 'collections.id', 'collection_dictionaries.collection_id')
    .selectAll('collections')
    .where('collection_dictionaries.dictionary_id', '=', dictionaryId)

  if (!options?.includeTrash) {
    query = query.where('collections.status', '!=', 'trash')
  }

  return query
    .orderBy('collections.menu_order', 'asc')
    .orderBy('collections.created_at', 'desc')
    .execute()
}

async function linkIn(
  executor: Kysely<Database> | Transaction<Database>,
  collectionId: number,
  dictionaryId: number,
): Promise<CollectionDictionary> {
  const inserted = await executor
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
  return executor
    .selectFrom('collection_dictionaries')
    .selectAll()
    .where('collection_id', '=', collectionId)
    .where('dictionary_id', '=', dictionaryId)
    .executeTakeFirstOrThrow()
}

function isUnsupportedKyselyTransaction(error: unknown): boolean {
  return error instanceof Error
    && error.message.includes('Kysely transactions are not supported on D1')
}

export async function linkCollectionDictionary(
  db: Kysely<Database>,
  collectionId: number,
  dictionaryId: number,
): Promise<CollectionDictionary> {
  if (db.isTransaction) {
    return linkIn(db, collectionId, dictionaryId)
  }
  try {
    return await db.transaction().execute(trx => linkIn(trx, collectionId, dictionaryId))
  }
  catch (error) {
    if (isUnsupportedKyselyTransaction(error)) {
      return linkIn(db, collectionId, dictionaryId)
    }
    throw error
  }
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
  return (result.numDeletedRows ?? 0n) > 0n
}
