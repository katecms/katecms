import { useRuntimeConfig } from '#imports'
import {
  createPostgresDb,
  createSqliteDb,
  resolveDatabaseTarget,
} from '@miraicms/core'

let db: ReturnType<typeof createSqliteDb> | undefined

function trimEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function isPostgresDriver(): boolean {
  return trimEnv(useRuntimeConfig().miraicms?.database?.driver) === 'postgres'
}

/** Kysely client for the SEO addon. Uses the same database as MiraiCMS. */
export function getSeoDb(): ReturnType<typeof createSqliteDb> {
  if (db) {
    return db
  }

  const database = useRuntimeConfig().miraicms?.database
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
