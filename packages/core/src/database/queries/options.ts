import type { Kysely, Selectable } from 'kysely'
import type { Database, OptionsTable } from '../client'

export type Option = Selectable<OptionsTable>

export async function listOptions(db: Kysely<Database>): Promise<Option[]> {
  return db
    .selectFrom('options')
    .selectAll()
    .orderBy('key', 'asc')
    .execute()
}

export async function findOption(
  db: Kysely<Database>,
  key: string,
): Promise<Option | undefined> {
  const normalized = key.trim()
  if (!normalized) {
    return undefined
  }
  return db
    .selectFrom('options')
    .selectAll()
    .where('key', '=', normalized)
    .executeTakeFirst()
}

export async function setOption(
  db: Kysely<Database>,
  key: string,
  value: unknown | null,
): Promise<Option> {
  const normalized = key.trim()
  if (!normalized) {
    throw new Error('[KateCMS] option key must be non-empty.')
  }
  return db
    .insertInto('options')
    .values({
      key: normalized,
      value,
    })
    .onConflict(oc => oc
      .columns(['key'])
      .doUpdateSet({ value }),
    )
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function deleteOption(
  db: Kysely<Database>,
  key: string,
): Promise<boolean> {
  const normalized = key.trim()
  if (!normalized) {
    return false
  }
  const result = await db
    .deleteFrom('options')
    .where('key', '=', normalized)
    .executeTakeFirst()
  return (result.numDeletedRows ?? 0n) > 0n
}
