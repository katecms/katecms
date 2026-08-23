import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { CompiledQuery, Kysely, SqliteDialect } from 'kysely'
import type { SqliteDatabase } from 'kysely'
import { D1Dialect } from './d1-dialect'
import type { D1Database } from './d1-dialect'
import type { Database } from './schema'
import { SqliteValuePlugin } from './values'

const require = createRequire(import.meta.url)

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

function isMemoryDatabase(filename: string): boolean {
  return filename === ':memory:' || filename.startsWith('file:')
}

function resolveSqliteFilename(filename: string): string {
  if (isMemoryDatabase(filename)) {
    return filename
  }
  const path = isAbsolute(filename) ? filename : resolve(filename)
  mkdirSync(dirname(path), { recursive: true })
  return path
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

  const database = options.database
    ? wrapDatabase(options.database, false)
    : wrapDatabase(openBetterSqlite(resolveSqliteFilename(options.filename!)), true)

  return new Kysely<Database>({
    dialect: new SqliteDialect({
      database,
      async onCreateConnection(connection) {
        await connection.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = ON'))
      },
    }),
    plugins: [new SqliteValuePlugin()],
  })
}
