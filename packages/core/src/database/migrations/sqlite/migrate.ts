import { SCHEMA_SQL } from './schema'
import { nodeRequire } from '../../client/node-require'
import { isMemorySqliteFilename, resolveSqliteFilename } from '../../client/sqlite-filename'

const require = nodeRequire

interface MigrationResult {
  applied: string[]
  alreadyApplied: string[]
}

interface SqliteStatement {
  all: (...params: unknown[]) => unknown
  run: (...params: unknown[]) => unknown
}

interface SqliteDatabase {
  exec: (sql: string) => unknown
  prepare: (sql: string) => SqliteStatement
  close?: () => unknown
}

interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>
  run: () => Promise<unknown>
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement
  exec: (query: string) => Promise<unknown>
}

interface MigrateSqliteOptions {
  filename?: string
  database?: SqliteDatabase
  d1?: D1Database
  schemaId?: string
  schemaSql?: string
}

const SCHEMA_ID = 'miraicms'
const LEDGER_TABLE = '_miraicms_migrations'

type SchemaJob = { id: string, sql: string }

interface SqliteDriver {
  sessionTransaction: boolean
  exec: (sql: string) => Promise<void>
  all: <T>(sql: string, params?: unknown[]) => Promise<T[]>
  run: (sql: string, params?: unknown[]) => Promise<void>
}

function resolveOptions(input: string | MigrateSqliteOptions): MigrateSqliteOptions {
  if (typeof input === 'string') {
    return { filename: input }
  }
  return input
}

function countTargets(options: MigrateSqliteOptions): number {
  return Number(Boolean(options.filename))
    + Number(Boolean(options.database))
    + Number(Boolean(options.d1))
}

function resolveExtraSchema(options: MigrateSqliteOptions): SchemaJob | undefined {
  const { schemaId, schemaSql } = options
  if (schemaId == null && schemaSql == null) {
    return undefined
  }
  if (schemaId == null || schemaSql == null) {
    throw new Error(
      '[MiraiCMS] schemaId and schemaSql must be passed together so the add-on SQL can be recorded in `_miraicms_migrations`.',
    )
  }

  const id = schemaId.trim()
  const sql = schemaSql.trim()
  if (!id || !sql) {
    throw new Error('[MiraiCMS] schemaId and schemaSql must be non-empty.')
  }
  if (id === SCHEMA_ID) {
    throw new Error(
      `[MiraiCMS] schemaId "${SCHEMA_ID}" is reserved for the core schema. Choose another id for add-on SQL.`,
    )
  }
  return { id, sql }
}

function adaptFileDatabase(db: SqliteDatabase): SqliteDriver {
  return {
    sessionTransaction: true,
    async exec(sql: string) {
      db.exec(sql)
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...params) as T[]
    },
    async run(sql: string, params: unknown[] = []) {
      db.prepare(sql).run(...params)
    },
  }
}

function adaptD1(d1: D1Database): SqliteDriver {
  return {
    sessionTransaction: false,
    async exec(sql: string) {
      await d1.exec(sql)
    },
    async all<T>(sql: string, params: unknown[] = []) {
      const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql)
      const { results } = await stmt.all()
      return results as T[]
    },
    async run(sql: string, params: unknown[] = []) {
      const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql)
      await stmt.run()
    },
  }
}

function isModuleNotFound(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND'),
  )
}

function isMissingNativeBindings(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('Could not locate the bindings')
    || (message.includes('.node') && message.includes('Cannot find module'))
}

function openFailed(path: string, cause: unknown): Error {
  return new Error(
    `[MiraiCMS] Could not open SQLite database file "${path}".`,
    { cause },
  )
}

function fileHandle(db: SqliteDatabase): { driver: SqliteDriver, close: () => void } {
  return {
    driver: adaptFileDatabase(db),
    close: () => {
      db.close?.()
    },
  }
}

function openWithBetterSqlite(path: string): { driver: SqliteDriver, close: () => void } {
  try {
    const Database = require('better-sqlite3') as new (file: string) => SqliteDatabase
    return fileHandle(new Database(path))
  }
  catch (error) {
    if (isModuleNotFound(error) || isMissingNativeBindings(error)) {
      throw new Error(
        '[MiraiCMS] migrateSqlite() needs the `better-sqlite3` package to open a file database. Pass `{ d1 }` for Cloudflare D1, or `{ database }` with an open SQLite connection.',
        { cause: error },
      )
    }
    throw openFailed(path, error)
  }
}

function openFileDatabase(filename: string): { driver: SqliteDriver, close: () => void } {
  return openWithBetterSqlite(resolveSqliteFilename(filename))
}

async function applyConnectionPragmas(
  driver: SqliteDriver,
  options: { busyTimeout: boolean, wal: boolean },
): Promise<void> {
  await driver.exec('PRAGMA foreign_keys = ON')
  if (options.busyTimeout) {
    await driver.exec('PRAGMA busy_timeout = 5000')
  }
  if (options.wal) {
    await driver.exec('PRAGMA journal_mode = WAL')
  }
}

async function withDriver<T>(
  options: MigrateSqliteOptions,
  fn: (driver: SqliteDriver) => Promise<T>,
): Promise<T> {
  if (options.d1) {
    const driver = adaptD1(options.d1)
    await applyConnectionPragmas(driver, { busyTimeout: false, wal: false })
    return fn(driver)
  }
  if (options.database) {
    const driver = adaptFileDatabase(options.database)
    await applyConnectionPragmas(driver, { busyTimeout: true, wal: false })
    return fn(driver)
  }
  if (!options.filename) {
    throw new Error(
      '[MiraiCMS] migrateSqlite() needs exactly one target: a file path, `{ filename }`, `{ database }`, or `{ d1 }`.',
    )
  }

  const { driver, close } = openFileDatabase(options.filename)
  try {
    await applyConnectionPragmas(driver, {
      busyTimeout: true,
      wal: !isMemorySqliteFilename(options.filename),
    })
    return await fn(driver)
  }
  finally {
    close()
  }
}

async function loadAppliedIds(driver: SqliteDriver): Promise<Set<string>> {
  const tables = await driver.all<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [LEDGER_TABLE],
  )
  if (tables.length === 0) {
    return new Set()
  }
  const ledger = await driver.all<{ id: string }>(`SELECT id FROM ${LEDGER_TABLE}`)
  return new Set(ledger.map(row => row.id))
}

async function applyOne(driver: SqliteDriver, id: string, sql: string): Promise<void> {
  if (driver.sessionTransaction) {
    await driver.exec(sql)
    await driver.run(`INSERT INTO ${LEDGER_TABLE} (id) VALUES (?)`, [id])
    return
  }

  const escapedId = id.replaceAll('\'', '\'\'')
  await driver.exec(
    `BEGIN IMMEDIATE;\n${sql}\nINSERT INTO ${LEDGER_TABLE} (id) VALUES ('${escapedId}');\nCOMMIT;`,
  )
}

async function applySchemas(driver: SqliteDriver, extra?: SchemaJob): Promise<MigrationResult> {
  await driver.exec('PRAGMA foreign_keys = ON')
  if (driver.sessionTransaction) {
    await driver.exec('BEGIN IMMEDIATE')
  }
  try {
    const jobs: SchemaJob[] = [
      { id: SCHEMA_ID, sql: SCHEMA_SQL },
      ...extra ? [extra] : [],
    ]
    const done = await loadAppliedIds(driver)
    const applied: string[] = []
    const alreadyApplied: string[] = []

    for (const job of jobs) {
      if (done.has(job.id)) {
        alreadyApplied.push(job.id)
        continue
      }
      await applyOne(driver, job.id, job.sql)
      applied.push(job.id)
      done.add(job.id)
    }

    if (driver.sessionTransaction) {
      await driver.exec('COMMIT')
    }
    return { applied, alreadyApplied }
  }
  catch (error) {
    if (driver.sessionTransaction) {
      try {
        await driver.exec('ROLLBACK')
      }
      catch {
        // Keep the original failure; a failed rollback is not more useful.
      }
    }
    throw error
  }
}

function sqliteDatabaseLabel(options: MigrateSqliteOptions): string {
  if (options.d1) {
    return 'Cloudflare D1 database'
  }
  if (options.filename != null && options.filename !== '') {
    return `SQLite database «${options.filename}»`
  }
  return 'SQLite database (open connection)'
}

function logMigrationResult(result: MigrationResult, database: string): void {
  for (const id of result.applied) {
    console.log(
      id === SCHEMA_ID
        ? `[MiraiCMS] The ${database} has been imported successfully.`
        : `[MiraiCMS] Schema «${id}» imported successfully into the ${database}.`,
    )
  }
  for (const id of result.alreadyApplied) {
    console.log(
      id === SCHEMA_ID
        ? `[MiraiCMS] The ${database} has already been imported previously.`
        : `[MiraiCMS] Schema «${id}» has already been imported previously into the ${database}.`,
    )
  }
}

export async function migrateSqlite(input: string | MigrateSqliteOptions): Promise<MigrationResult> {
  const options = resolveOptions(input)
  if (countTargets(options) !== 1) {
    throw new Error(
      '[MiraiCMS] migrateSqlite() needs exactly one target: a file path, `{ filename }`, `{ database }`, or `{ d1 }`.',
    )
  }

  const result = await withDriver(options, driver => applySchemas(driver, resolveExtraSchema(options)))
  logMigrationResult(result, sqliteDatabaseLabel(options))
  return result
}
