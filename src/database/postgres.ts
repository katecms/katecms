import { Kysely, PostgresDialect } from 'kysely'
import type { PostgresPool } from 'kysely'
import pg from 'pg'
import type { ClientConfig, Pool } from 'pg'
import type { Database } from './schema'
import { PostgresJsonPlugin } from './values'

export interface CreatePostgresDbOptions extends ClientConfig {
  /** Existing `pg.Pool`. `db.destroy()` does not end it. */
  pool?: Pool
}

let int8ParserInstalled = false

function installInt8Parser(): void {
  if (int8ParserInstalled) {
    return
  }
  int8ParserInstalled = true
  // bigint / identity columns otherwise arrive as strings.
  pg.types.setTypeParser(pg.types.builtins.INT8, value => Number(value))
}

function resolveOptions(input: string | CreatePostgresDbOptions): CreatePostgresDbOptions {
  if (typeof input === 'string') {
    return { connectionString: input }
  }
  return input
}

function hasConnectionConfig(options: CreatePostgresDbOptions): boolean {
  return Boolean(
    options.connectionString
    || options.host
    || options.database
    || options.user,
  )
}

function toClientConfig(options: CreatePostgresDbOptions): ClientConfig {
  const { pool: _pool, ...clientConfig } = options
  return clientConfig
}

function toKyselyPool(pool: Pool, endOnDestroy: boolean): PostgresPool {
  return {
    connect: () => pool.connect(),
    end: async () => {
      if (endOnDestroy) {
        await pool.end()
      }
    },
    options: pool.options,
  }
}

/**
 * Typed Kysely client for PostgreSQL. Connection is passed in; nothing is read
 * from env. Call `db.destroy()` to close a pool this function created.
 */
export function createPostgresDb(input: string | CreatePostgresDbOptions): Kysely<Database> {
  const options = resolveOptions(input)
  if (!options.pool && !hasConnectionConfig(options)) {
    throw new Error(
      '[MiraiCMS] createPostgresDb() needs a database connection: pass a URL string, `connectionString`, host/database credentials, or an existing `pool`.',
    )
  }

  installInt8Parser()

  const pool = options.pool ?? new pg.Pool(toClientConfig(options))
  const endOnDestroy = !options.pool

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: toKyselyPool(pool, endOnDestroy),
    }),
    plugins: [new PostgresJsonPlugin()],
  })
}
