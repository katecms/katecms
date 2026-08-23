import {
  CompiledQuery,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from 'kysely'
import type {
  DatabaseConnection,
  Dialect,
  Driver,
  Kysely,
  QueryResult,
} from 'kysely'
import type { Database } from './schema'

export interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>
  run: () => Promise<{
    meta?: { changes?: number, last_row_id?: number }
    results?: unknown[]
  }>
}

export interface D1Database {
  prepare: (query: string) => D1PreparedStatement
  exec?: (query: string) => Promise<unknown>
}

function pragmaReturnsRows(sql: string): boolean {
  const trimmed = sql.trim()
  if (!/^PRAGMA\b/i.test(trimmed)) {
    return false
  }
  // `PRAGMA name = value` is a setter. Bare / function PRAGMAs return rows
  // (`table_info`, `foreign_key_list`, `journal_mode`, …).
  return !/=/.test(trimmed)
}

function returnsRows(sql: string): boolean {
  const trimmed = sql.trimStart()
  if (/^PRAGMA\b/i.test(trimmed)) {
    return pragmaReturnsRows(trimmed)
  }
  const head = trimmed.slice(0, 12).toUpperCase()
  return head.startsWith('SELECT')
    || head.startsWith('WITH')
    || head.startsWith('EXPLAIN')
    || /\bRETURNING\b/i.test(sql)
}

function bindStatement(
  statement: D1PreparedStatement,
  parameters: ReadonlyArray<unknown>,
): D1PreparedStatement {
  if (parameters.length === 0) {
    return statement
  }
  return statement.bind(...parameters)
}

class D1Connection implements DatabaseConnection {
  readonly #database: D1Database

  constructor(database: D1Database) {
    this.#database = database
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const statement = bindStatement(
      this.#database.prepare(compiledQuery.sql),
      compiledQuery.parameters,
    )
    if (returnsRows(compiledQuery.sql)) {
      const { results } = await statement.all<R>()
      return { rows: results ?? [] }
    }
    const result = await statement.run()
    return {
      rows: (result.results ?? []) as R[],
      numAffectedRows: result.meta?.changes != null ? BigInt(result.meta.changes) : undefined,
      insertId: result.meta?.last_row_id != null ? BigInt(result.meta.last_row_id) : undefined,
    }
  }

  streamQuery(): AsyncIterableIterator<QueryResult<never>> {
    throw new Error('[MiraiCMS] D1 does not support streaming queries.')
  }
}

class D1Driver implements Driver {
  readonly #database: D1Database
  #connection: D1Connection | undefined

  constructor(database: D1Database) {
    this.#database = database
  }

  async init(): Promise<void> {
    this.#connection = new D1Connection(this.#database)
    await this.#connection.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = ON'))
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    return this.#connection!
  }

  async beginTransaction(): Promise<void> {
    throw new Error(
      '[MiraiCMS] Kysely transactions are not supported on D1. Use a single query or D1 batch().',
    )
  }

  async commitTransaction(): Promise<void> {
    throw new Error('[MiraiCMS] Kysely transactions are not supported on D1.')
  }

  async rollbackTransaction(): Promise<void> {
    throw new Error('[MiraiCMS] Kysely transactions are not supported on D1.')
  }

  async releaseConnection(): Promise<void> {
    // D1 has no session to return.
  }

  async destroy(): Promise<void> {
    this.#connection = undefined
  }
}

/** Kysely dialect for a Cloudflare D1 binding. */
export class D1Dialect implements Dialect {
  readonly #database: D1Database

  constructor(database: D1Database) {
    this.#database = database
  }

  createDriver(): Driver {
    return new D1Driver(this.#database)
  }

  createQueryCompiler(): SqliteQueryCompiler {
    return new SqliteQueryCompiler()
  }

  createAdapter(): SqliteAdapter {
    return new SqliteAdapter()
  }

  createIntrospector(db: Kysely<Database>): SqliteIntrospector {
    return new SqliteIntrospector(db)
  }
}
