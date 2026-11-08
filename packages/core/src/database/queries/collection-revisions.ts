import type { Insertable, Kysely, Selectable } from 'kysely'
import type { CollectionRevisionsTable, Database } from '../client'
import { applyListPaging } from './paging'
import type { ListPaging } from './paging'

export type CollectionRevision = Selectable<CollectionRevisionsTable>
export type NewCollectionRevision = Insertable<CollectionRevisionsTable>

export async function findCollectionRevisionById(
  db: Kysely<Database>,
  id: number,
): Promise<CollectionRevision | undefined> {
  return db
    .selectFrom('collection_revisions')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

export async function listCollectionRevisions(
  db: Kysely<Database>,
  collectionId: number,
  paging?: ListPaging,
): Promise<CollectionRevision[]> {
  const query = db
    .selectFrom('collection_revisions')
    .selectAll()
    .where('collection_id', '=', collectionId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
  return applyListPaging(query, paging).execute()
}

export async function createCollectionRevision(
  db: Kysely<Database>,
  values: NewCollectionRevision,
): Promise<CollectionRevision> {
  return db
    .insertInto('collection_revisions')
    .values(values)
    .returningAll()
    .executeTakeFirstOrThrow()
}
