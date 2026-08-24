import type { Insertable, Kysely, Selectable, Updateable } from 'kysely'
import type { Database, MediaTable } from '../client/schema'

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

export async function listMedia(db: Kysely<Database>): Promise<Media[]> {
  return db
    .selectFrom('media')
    .selectAll()
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .execute()
}

export async function createMedia(
  db: Kysely<Database>,
  values: NewMedia,
): Promise<Media> {
  return db
    .insertInto('media')
    .values({
      ...values,
      filename: values.filename.trim(),
      mime_type: values.mime_type.trim(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()
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
