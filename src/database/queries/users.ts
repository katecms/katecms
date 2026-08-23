import type { Insertable, Kysely, Selectable, Updateable } from 'kysely'
import { sql } from 'kysely'
import type { Database, UsersTable } from '../schema'

export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>
export type UserUpdate = Updateable<UsersTable>

function definedValues<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}

export async function findUserById(
  db: Kysely<Database>,
  id: number,
): Promise<User | undefined> {
  return db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

export async function findUserByEmail(
  db: Kysely<Database>,
  email: string,
): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }
  return db
    .selectFrom('users')
    .selectAll()
    .where(sql<string>`lower(email)`, '=', normalized)
    .executeTakeFirst()
}

export async function listUsers(db: Kysely<Database>): Promise<User[]> {
  return db
    .selectFrom('users')
    .selectAll()
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')
    .execute()
}

export async function createUser(
  db: Kysely<Database>,
  values: NewUser,
): Promise<User> {
  return db
    .insertInto('users')
    .values({
      ...values,
      email: values.email.trim(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function updateUser(
  db: Kysely<Database>,
  id: number,
  values: UserUpdate,
): Promise<User | undefined> {
  const { id: _id, ...rest } = values
  const patch = definedValues(rest)
  if (Object.keys(patch).length === 0) {
    return findUserById(db, id)
  }
  return db
    .updateTable('users')
    .set(patch)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}
