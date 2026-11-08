import type { Insertable, Kysely, Selectable, SqlBool, Updateable } from 'kysely'
import { sql } from 'kysely'
import { OWNER_ROLE } from '../../config'
import type { SafeUser } from '../../auth'
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

const LAST_OWNER_ERROR = 'Cannot remove the last owner.'

function isPostgres(db: Kysely<Database>): boolean {
  return db.getExecutor().adapter.constructor.name === 'PostgresAdapter'
}

/** Keep a password change and the session bump in one UPDATE. */
function withSessionBump(patch: UserUpdate) {
  if (patch.password_hash === undefined) {
    return patch
  }
  const { session_version: _sessionVersion, ...rest } = patch
  return {
    ...rest,
    session_version: sql<number>`session_version + 1`,
  }
}

/**
 * SQLite/D1 cannot `FOR UPDATE`. The count check lives in the write itself so
 * two connections cannot both observe two owners and remove them.
 */
function keepsAnOwner() {
  // Parentheses are required: `AND` binds tighter than `OR`, so a bare
  // predicate would delete every row once more than one owner exists.
  return sql<SqlBool>`(role <> ${OWNER_ROLE} or (select count(*) from users where role = ${OWNER_ROLE}) > 1)`
}

/** Lock every owner row so a second Postgres transaction sees the first commit. */
async function lockOwners(db: Kysely<Database>): Promise<void> {
  await db
    .selectFrom('users')
    .select('id')
    .where('role', '=', OWNER_ROLE)
    .forUpdate()
    .execute()
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
    throw new Error(LAST_OWNER_ERROR)
  }
}

/** The write matched nothing. That is the last-owner refusal when the row is still owner. */
async function throwIfOwnerUnchanged(db: Kysely<Database>, id: number): Promise<void> {
  const current = await findUserById(db, id)
  if (current?.role === OWNER_ROLE) {
    throw new Error(LAST_OWNER_ERROR)
  }
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
  const next = withSessionBump(patch)
  const demoting = patch.role !== undefined && patch.role !== OWNER_ROLE

  if (isPostgres(db)) {
    if (!demoting) {
      return db
        .updateTable('users')
        .set(next)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    }
    return db.transaction().execute(async (trx) => {
      await lockOwners(trx)
      const current = await findUserById(trx, id)
      if (current?.role === OWNER_ROLE) {
        await assertNotLastOwner(trx, id)
      }
      return trx
        .updateTable('users')
        .set(next)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    })
  }

  const updated = await db
    .updateTable('users')
    .set(next)
    .where('id', '=', id)
    .$if(demoting, query => query.where(keepsAnOwner()))
    .returningAll()
    .executeTakeFirst()
  if (!updated && demoting) {
    await throwIfOwnerUnchanged(db, id)
  }
  return updated
}

export async function deleteUser(
  db: Kysely<Database>,
  id: number,
): Promise<User | undefined> {
  if (isPostgres(db)) {
    return db.transaction().execute(async (trx) => {
      await lockOwners(trx)
      await assertNotLastOwner(trx, id)
      return trx
        .deleteFrom('users')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    })
  }

  const removed = await db
    .deleteFrom('users')
    .where('id', '=', id)
    .where(keepsAnOwner())
    .returningAll()
    .executeTakeFirst()
  if (!removed) {
    await throwIfOwnerUnchanged(db, id)
  }
  return removed
}
