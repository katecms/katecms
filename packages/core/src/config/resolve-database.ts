import type { DatabaseConfig, DatabaseDriver, ResolvedDatabaseConfig } from './types'
import { defaults } from './defaults'

export interface ResolveDatabaseResult {
  database: ResolvedDatabaseConfig
  warnings: string[]
}

function trim(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Apply database defaults. Does not pick a migrate target or read env. */
export function resolveDatabaseConfig(config?: DatabaseConfig): ResolveDatabaseResult {
  const warnings: string[] = []
  const database = config ?? {}
  const driverRaw = trim(database.driver)
  let driver: DatabaseDriver | '' = ''
  if (driverRaw) {
    if (driverRaw === 'postgres' || driverRaw === 'sqlite') {
      driver = driverRaw
    }
    else {
      warnings.push(
        `Unknown database driver "${driverRaw}". Use "postgres" or "sqlite".`,
      )
    }
  }

  return {
    database: {
      driver,
      url: trim(database.url),
      sqliteFilename: trim(database.sqliteFilename) || defaults.database.sqliteFilename,
    },
    warnings,
  }
}
