import { useRuntimeConfig } from '#imports'
import {
  createPostgresDb,
  createSqliteDb,
  resolveDatabaseTarget,
} from '@katecms/core'

let db: ReturnType<typeof createSqliteDb> | undefined

function trimEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Singleton Kysely client for Nitro handlers. */
export function getDb(): ReturnType<typeof createSqliteDb> {
  if (db) {
    return db
  }

  const database = useRuntimeConfig().katecms?.database
  const driver = trimEnv(database?.driver)
  const url = trimEnv(database?.url)
    || (driver === 'postgres' ? trimEnv(process.env.DATABASE_URL) : '')

  const target = resolveDatabaseTarget({
    driver,
    url,
    sqliteFilename: database?.sqliteFilename,
  })

  db = target.driver === 'postgres'
    ? createPostgresDb(target.url)
    : createSqliteDb({ filename: target.filename })

  return db
}
