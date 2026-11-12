import { Kysely, PostgresDialect } from 'kysely'
import type { PostgresPool } from 'kysely'
import pg from 'pg'
import type { ClientConfig, CustomTypesConfig, Pool } from 'pg'
import type { Database } from './schema'
import { PostgresJsonPlugin } from './values'

export interface CreatePostgresDbOptions extends ClientConfig {
  /** Existing `pg.Pool`. `db.destroy()` does not end it. */
  pool?: Pool
}

function cmsInt8Types(): CustomTypesConfig {
  return {
    getTypeParser: (oid, format) => {
      if (oid === pg.types.builtins.INT8) {
        return (value: string) => Number(value)
      }
      return pg.types.getTypeParser(oid, format)
    },
  }
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
  return {
    ...clientConfig,
    types: cmsInt8Types(),
  }
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
 *
 * INT8 (`bigint` / identity) is parsed as `number` only on pools this function
 * creates. An existing `pool` keeps its own type parsers.
 */
export function createPostgresDb(input: string | CreatePostgresDbOptions): Kysely<Database> {
  const options = resolveOptions(input)
  if (!options.pool && !hasConnectionConfig(options)) {
    throw new Error(
      '[KateCMS] createPostgresDb() needs a database connection: pass a URL string, `connectionString`, host/database credentials, or an existing `pool`.',
    )
  }

  const pool = options.pool ?? new pg.Pool(toClientConfig(options))
  const endOnDestroy = !options.pool

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: toKyselyPool(pool, endOnDestroy),
    }),
    plugins: [new PostgresJsonPlugin()],
  })
}
