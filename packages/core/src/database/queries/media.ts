import type { Insertable, Kysely, Selectable, Updateable } from 'kysely'
import type { Database, MediaTable } from '../client/schema'
import { incrementFilename } from '../../media/filename'
import { isUniqueConstraintError } from './errors'
import { applyListPaging } from './paging'
import type { ListPaging } from './paging'

export type Media = Selectable<MediaTable>
export type NewMedia = Insertable<MediaTable>
export type MediaUpdate = Updateable<MediaTable>

function definedValues<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}

export async function findMediaById(
  db: Kysely<Database>,
  id: number,
): Promise<Media | undefined> {
  return db
    .selectFrom('media')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

export async function findMediaByFilename(
  db: Kysely<Database>,
  filename: string,
): Promise<Media | undefined> {
  const normalized = filename.trim()
  if (!normalized) {
    return undefined
  }
  return db
    .selectFrom('media')
    .selectAll()
    .where('filename', '=', normalized)
    .executeTakeFirst()
}

export async function listMedia(
  db: Kysely<Database>,
  paging?: ListPaging,
): Promise<Media[]> {
  const query = db
    .selectFrom('media')
    .selectAll()
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
  return applyListPaging(query, paging).execute()
}

const MAX_FILENAME_RETRIES = 8

export async function createMedia(
  db: Kysely<Database>,
  values: NewMedia,
): Promise<Media> {
  let filename = values.filename.trim()
  const mimeType = values.mime_type.trim()
  for (let attempt = 0; attempt <= MAX_FILENAME_RETRIES; attempt++) {
    try {
      return await db
        .insertInto('media')
        .values({
          ...values,
          filename,
          mime_type: mimeType,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    }
    catch (error) {
      if (attempt === MAX_FILENAME_RETRIES || !isUniqueConstraintError(error)) {
        throw error
      }
      filename = incrementFilename(filename)
    }
  }
  throw new Error('Could not allocate a unique media filename.')
}

export async function updateMedia(
  db: Kysely<Database>,
  id: number,
  values: MediaUpdate,
): Promise<Media | undefined> {
  const { id: _id, ...rest } = values
  const patch = definedValues({
    ...rest,
    ...rest.filename !== undefined ? { filename: rest.filename.trim() } : {},
    ...rest.mime_type !== undefined ? { mime_type: rest.mime_type.trim() } : {},
  })
  if (Object.keys(patch).length === 0) {
    return findMediaById(db, id)
  }
  return db
    .updateTable('media')
    .set(patch)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export async function deleteMedia(
  db: Kysely<Database>,
  id: number,
): Promise<Media | undefined> {
  return db
    .deleteFrom('media')
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}
