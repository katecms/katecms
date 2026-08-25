import { CompiledQuery, Kysely, SqliteDialect } from 'kysely'
import type { SqliteDatabase } from 'kysely'
import { nodeRequire } from './node-require'
import { isMemorySqliteFilename, resolveSqliteFilename } from './sqlite-filename'
import { D1Dialect } from './d1-dialect'
import type { D1Database } from './d1-dialect'
import type { Database } from './schema'
import { SqliteValuePlugin } from './values'

const require = nodeRequire

export interface CreateSqliteDbOptions {
  filename?: string
  /** Existing better-sqlite3 connection. `db.destroy()` does not close it. */
  database?: SqliteDatabase
  /** Cloudflare D1 binding. */
  d1?: D1Database
}

function resolveOptions(input: string | CreateSqliteDbOptions): CreateSqliteDbOptions {
  if (typeof input === 'string') {
    return { filename: input }
  }
  return input
}

function openBetterSqlite(path: string): SqliteDatabase {
  const Database = require('better-sqlite3') as new (file: string) => SqliteDatabase
  return new Database(path)
}

function wrapDatabase(database: SqliteDatabase, closeOnDestroy: boolean): SqliteDatabase {
  return {
    prepare: sql => database.prepare(sql),
    close: () => {
      if (closeOnDestroy) {
        database.close()
      }
    },
  }
}

async function applySqlitePragmas(
  connection: { executeQuery: (query: CompiledQuery) => Promise<unknown> },
  wal: boolean,
): Promise<void> {
  await connection.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = ON'))
  await connection.executeQuery(CompiledQuery.raw('PRAGMA busy_timeout = 5000'))
  if (wal) {
    await connection.executeQuery(CompiledQuery.raw('PRAGMA journal_mode = WAL'))
  }
}

/**
 * Typed Kysely client for a SQLite file or Cloudflare D1. Connection is passed
 * in; nothing is read from env. Call `db.destroy()` to close a file this
 * function opened. D1 bindings are not closed.
 */
export function createSqliteDb(input: string | CreateSqliteDbOptions): Kysely<Database> {
  const options = resolveOptions(input)
  const targets = Number(Boolean(options.filename))
    + Number(Boolean(options.database))
    + Number(Boolean(options.d1))
  if (targets !== 1) {
    throw new Error(
      '[MiraiCMS] createSqliteDb() needs exactly one target: a file path, `{ filename }`, `{ database }`, or `{ d1 }`.',
    )
  }

  if (options.d1) {
    return new Kysely<Database>({
      dialect: new D1Dialect(options.d1),
      plugins: [new SqliteValuePlugin()],
    })
  }

  const openedFile = options.filename != null && !isMemorySqliteFilename(options.filename)
  const database = options.database
    ? wrapDatabase(options.database, false)
    : wrapDatabase(openBetterSqlite(resolveSqliteFilename(options.filename!)), true)

  return new Kysely<Database>({
    dialect: new SqliteDialect({
      database,
      async onCreateConnection(connection) {
        await applySqlitePragmas(connection, openedFile)
      },
    }),
    plugins: [new SqliteValuePlugin()],
  })
}
