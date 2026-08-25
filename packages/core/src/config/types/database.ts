/** Database engine used by the CMS adapter. */
export type DatabaseDriver = 'postgres' | 'sqlite'

/**
 * User-facing database configuration.
 *
 * Core does not read env. The Nuxt/Next adapter passes `url` from config and,
 * when `driver` is `'postgres'`, may also pass `DATABASE_URL`.
 *
 * @example
 * // PostgreSQL 15+
 * { driver: 'postgres', url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms' }
 *
 * @example
 * // SQLite (default filename is `data/miraicms.db`)
 * { sqliteFilename: 'data/miraicms.db' }
 */
export interface DatabaseConfig {
  /**
   * Database engine. When omitted, a non-empty `url` selects Postgres,
   * otherwise SQLite.
   */
  driver?: DatabaseDriver
  /**
   * PostgreSQL connection string.
   * Example: `postgres://postgres:admin@127.0.0.1:5432/miraicms`.
   */
  url?: string
  /**
   * SQLite file path, `:memory:`, or `file:` URI.
   * Relative paths are resolved by the adapter (Nuxt: against `rootDir`).
   * Default: `data/miraicms.db`.
   */
  sqliteFilename?: string
}

/** Database config after defaults and trimming. */
export interface ResolvedDatabaseConfig {
  /** Empty string means auto: Postgres if `url` is set, otherwise SQLite. */
  driver: DatabaseDriver | ''
  url: string
  sqliteFilename: string
}
