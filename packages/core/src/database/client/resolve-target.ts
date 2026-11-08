import type { DatabaseDriver } from '../../config'

export interface ResolveDatabaseTargetInput {
  /** `postgres` or `sqlite`. When omitted, a non-empty `url` selects Postgres. */
  driver?: string | null
  /** PostgreSQL connection string. */
  url?: string | null
  /** SQLite file path, `:memory:`, or `file:` URI. */
  sqliteFilename?: string | null
}

export type DatabaseTarget
  = | { driver: 'postgres', url: string }
    | { driver: 'sqlite', filename: string }

function trim(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseDriver(value: string): DatabaseDriver | '' {
  if (value === 'postgres' || value === 'sqlite') {
    return value
  }
  if (value) {
    throw new Error(
      `[MiraiCMS] Unknown database driver "${value}". Use "postgres" or "sqlite".`,
    )
  }
  return ''
}

/**
 * Pick Postgres vs SQLite from adapter-supplied values.
 * Does not read env: pass `url` already resolved from config and/or environment.
 */
export function resolveDatabaseTarget(input: ResolveDatabaseTargetInput): DatabaseTarget {
  const driver = parseDriver(trim(input.driver))
  const url = trim(input.url)
  const sqliteFilename = trim(input.sqliteFilename)
  const resolvedDriver: DatabaseDriver = driver || (url ? 'postgres' : 'sqlite')

  if (resolvedDriver === 'postgres') {
    if (!url) {
      throw new Error(
        '[MiraiCMS] Postgres is selected but no connection URL was provided.',
      )
    }
    return { driver: 'postgres', url }
  }

  if (!sqliteFilename) {
    throw new Error(
      '[MiraiCMS] SQLite is selected but no filename was provided.',
    )
  }

  return { driver: 'sqlite', filename: sqliteFilename }
}
