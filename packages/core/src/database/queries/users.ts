import type { Insertable, Kysely, Selectable, Updateable } from 'kysely'
import { sql } from 'kysely'
import { OWNER_ROLE } from '../../config'
import type { SafeUser } from '../../auth/types'
import type { Database, UsersTable } from '../client'
import { applyListPaging } from './paging'
import type { ListPaging } from './paging'

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

export async function listUsers(
  db: Kysely<Database>,
  paging?: ListPaging,
): Promise<User[]> {
  const query = db
    .selectFrom('users')
    .selectAll()
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')
  return applyListPaging(query, paging).execute()
}

/** Whether at least one account exists (drives first-run registration). */
export async function hasAnyUser(db: Kysely<Database>): Promise<boolean> {
  const row = await db
    .selectFrom('users')
    .select('id')
    .limit(1)
    .executeTakeFirst()
  return Boolean(row)
}

export function toSafeUser(user: User | SafeUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar ?? null,
    role: user.role,
  }
}

export async function createUser(
  db: Kysely<Database>,
  values: NewUser,
): Promise<User> {
  return db
    .insertInto('users')
    .values({
      ...values,
      email: values.email.trim().toLowerCase(),
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
  const patch = definedValues({
    ...rest,
    ...rest.email !== undefined ? { email: rest.email.trim().toLowerCase() } : {},
  })
  if (Object.keys(patch).length === 0) {
    return findUserById(db, id)
  }
  if (patch.role !== undefined && patch.role !== OWNER_ROLE) {
    const current = await findUserById(db, id)
    if (current?.role === OWNER_ROLE) {
      await assertNotLastOwner(db, id)
    }
  }
  return db
    .updateTable('users')
    .set(patch)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

async function countOwners(db: Kysely<Database>): Promise<number> {
  const row = await db
    .selectFrom('users')
    .select(db.fn.countAll<number>().as('count'))
    .where('role', '=', OWNER_ROLE)
    .executeTakeFirstOrThrow()
  return Number(row.count)
}

async function assertNotLastOwner(db: Kysely<Database>, userId: number): Promise<void> {
  const remaining = await countOwners(db)
  const user = await findUserById(db, userId)
  if (user?.role === OWNER_ROLE && remaining <= 1) {
    throw new Error('Cannot remove the last owner.')
  }
}

export async function deleteUser(
  db: Kysely<Database>,
  id: number,
): Promise<User | undefined> {
  await assertNotLastOwner(db, id)
  return db
    .deleteFrom('users')
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}
