import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createPostgresDb,
  createUser,
  deleteOption,
  deleteUser,
  findUserByEmail,
  migratePostgres,
  setOption,
} from '../src'
import type { Kysely } from 'kysely'
import type { Database } from '../src'

/** Override with DATABASE_URL. Default is the local URL from the README. */
const POSTGRES_URL = process.env.DATABASE_URL
  ?? 'postgres://postgres:admin@127.0.0.1:5432/katecms'

async function postgresAvailable(url: string): Promise<boolean> {
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 1500,
  })
  try {
    await client.connect()
    await client.end()
    return true
  }
  catch {
    try {
      await client.end()
    }
    catch {
      // already closed
    }
    return false
  }
}

const available = await postgresAvailable(POSTGRES_URL)

describe.skipIf(!available)('postgres', () => {
  let db: Kysely<Database>

  beforeAll(async () => {
    await migratePostgres(POSTGRES_URL)
    db = createPostgresDb(POSTGRES_URL)
  })

  afterAll(async () => {
    await db?.destroy()
  })

  it('round-trips JSON and a user', async () => {
    const key = `vitest.pg.${Date.now()}`
    const email = `pg-test-${Date.now()}@example.com`

    expect(await setOption(db, key, { ok: true })).toMatchObject({ value: { ok: true } })
    await deleteOption(db, key)

    const user = await createUser(db, {
      email,
      password_hash: 'hash',
    })
    expect(user.email).toBe(email)
    expect(await findUserByEmail(db, email)).toMatchObject({ id: user.id })
    await deleteUser(db, user.id)
  })
})
