import type { Insertable, Kysely, Selectable, Updateable } from 'kysely'
import type { Database, DictionariesTable } from '../client/schema'

export type Dictionary = Selectable<DictionariesTable>
export type NewDictionary = Insertable<DictionariesTable>
export type DictionaryUpdate = Updateable<DictionariesTable>

function definedValues<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}

export async function findDictionaryById(
  db: Kysely<Database>,
  id: number,
): Promise<Dictionary | undefined> {
  return db
    .selectFrom('dictionaries')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

export async function findDictionaryByTypeAndSlug(
  db: Kysely<Database>,
  type: string,
  slug: string,
): Promise<Dictionary | undefined> {
  const normalizedSlug = slug.trim()
  if (!normalizedSlug) {
    return undefined
  }
  return db
    .selectFrom('dictionaries')
    .selectAll()
    .where('type', '=', type)
    .where('slug', '=', normalizedSlug)
    .executeTakeFirst()
}

export async function listDictionaries(
  db: Kysely<Database>,
  type: string,
): Promise<Dictionary[]> {
  return db
    .selectFrom('dictionaries')
    .selectAll()
    .where('type', '=', type)
    .orderBy('title', 'asc')
    .orderBy('id', 'asc')
    .execute()
}

export async function createDictionary(
  db: Kysely<Database>,
  values: NewDictionary,
): Promise<Dictionary> {
  return db
    .insertInto('dictionaries')
    .values({
      ...values,
      type: values.type.trim(),
      slug: values.slug.trim(),
      title: values.title.trim(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function updateDictionary(
  db: Kysely<Database>,
  id: number,
  values: DictionaryUpdate,
): Promise<Dictionary | undefined> {
  const { id: _id, ...rest } = values
  const patch = definedValues({
    ...rest,
    ...rest.type !== undefined ? { type: rest.type.trim() } : {},
    ...rest.slug !== undefined ? { slug: rest.slug.trim() } : {},
    ...rest.title !== undefined ? { title: rest.title.trim() } : {},
  })
  if (Object.keys(patch).length === 0) {
    return findDictionaryById(db, id)
  }
  return db
    .updateTable('dictionaries')
    .set(patch)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export async function deleteDictionary(
  db: Kysely<Database>,
  id: number,
): Promise<Dictionary | undefined> {
  return db
    .deleteFrom('dictionaries')
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}
