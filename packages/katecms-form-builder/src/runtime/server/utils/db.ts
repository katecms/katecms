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

export function isPostgresDriver(): boolean {
  return trimEnv(useRuntimeConfig().katecms?.database?.driver) === 'postgres'
}

/** Kysely client for the forms addon. Uses the same database as KateCMS. */
export function getFormDb(): ReturnType<typeof createSqliteDb> {
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

export function maxFileBytes(): number {
  const configured = Number(useRuntimeConfig().katecms?.form?.maxFileBytes)
  if (Number.isFinite(configured) && configured > 0) {
    return configured
  }
  return 10 * 1024 * 1024
}
