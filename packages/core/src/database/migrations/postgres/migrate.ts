import pg from 'pg'
import type { ClientConfig, Pool } from 'pg'
import { SCHEMA_SQL } from './schema'

interface MigrationResult {
  applied: string[]
  alreadyApplied: string[]
}

interface MigrateOptions extends ClientConfig {
  pool?: Pool
  schemaId?: string
  schemaSql?: string
}

const SCHEMA_ID = 'katecms'

// Arbitrary but stable key for pg_advisory_xact_lock, preventing two processes
// (server instances or CLI runs) from migrating concurrently.
const MIGRATION_LOCK_KEY = 480719

// Minimum supported server, in `server_version_num` form (PostgreSQL 15.0):
// the SQL schema relies on 15+ syntax such as NULLS NOT DISTINCT.
const MIN_SERVER_VERSION_NUM = 150000

type Queryable = Pick<pg.Client, 'query'>
type SchemaJob = { id: string, sql: string }

function hasConnectionConfig(options: MigrateOptions): boolean {
  return Boolean(
    options.connectionString
    || options.host
    || options.database
    || options.user,
  )
}

function toClientConfig(options: MigrateOptions): pg.ClientConfig {
  const {
    pool: _pool,
    schemaSql: _schemaSql,
    schemaId: _schemaId,
    ...clientConfig
  } = options
  return clientConfig
}

function resolveOptions(input: string | MigrateOptions): MigrateOptions {
  if (typeof input === 'string') {
    return { connectionString: input }
  }
  return input
}

function resolveExtraSchema(options: MigrateOptions): SchemaJob | undefined {
  const { schemaId, schemaSql } = options
  if (schemaId == null && schemaSql == null) {
    return undefined
  }
  if (schemaId == null || schemaSql == null) {
    throw new Error(
      '[KateCMS] schemaId and schemaSql must be passed together so the add-on SQL can be recorded in `_katecms_migrations`.',
    )
  }

  const id = schemaId.trim()
  const sql = schemaSql.trim()
  if (!id || !sql) {
    throw new Error('[KateCMS] schemaId and schemaSql must be non-empty.')
  }
  if (id === SCHEMA_ID) {
    throw new Error(
      `[KateCMS] schemaId "${SCHEMA_ID}" is reserved for the core schema. Choose another id for add-on SQL.`,
    )
  }
  return { id, sql }
}

async function loadAppliedIds(client: Queryable): Promise<Set<string>> {
  const exists = await client.query<{ regclass: string | null }>(
    `SELECT to_regclass('_katecms_migrations') AS regclass`,
  )
  if (!exists.rows[0]?.regclass) {
    return new Set()
  }
  const ledger = await client.query<{ id: string }>(
    'SELECT id FROM _katecms_migrations',
  )
  return new Set(ledger.rows.map(row => row.id))
}

async function applyOne(
  client: Queryable,
  id: string,
  sql: string,
): Promise<void> {
  // Parameter-less query uses the simple query protocol so Postgres runs
  // a multi-statement script as one batch.
  await client.query(sql)
  await client.query(
    'INSERT INTO _katecms_migrations (id) VALUES ($1)',
    [id],
  )
}

async function applySchemas(
  client: Queryable,
  extra?: SchemaJob,
): Promise<MigrationResult & { database: string }> {
  await client.query('BEGIN')
  try {
    const version = await client.query<{ num: string, label: string, db: string }>(`
      SELECT current_setting('server_version_num') AS num,
             current_setting('server_version') AS label,
             current_database() AS db
    `)
    const { num, label, db } = version.rows[0]!
    if (Number(num) < MIN_SERVER_VERSION_NUM) {
      throw new Error(
        `[KateCMS] PostgreSQL 15 or newer is required to run CMS migrations (found ${label}).`,
      )
    }

    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY])

    const jobs: SchemaJob[] = [
      { id: SCHEMA_ID, sql: SCHEMA_SQL },
      ...extra ? [extra] : [],
    ]
    const done = await loadAppliedIds(client)
    const applied: string[] = []
    const alreadyApplied: string[] = []

    for (const job of jobs) {
      if (done.has(job.id)) {
        alreadyApplied.push(job.id)
        continue
      }
      await applyOne(client, job.id, job.sql)
      applied.push(job.id)
      done.add(job.id)
    }
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0',
    )

    await client.query('COMMIT')
    return { applied, alreadyApplied, database: db }
  }
  catch (error) {
    try {
      await client.query('ROLLBACK')
    }
    catch {
      // Keep the original failure; a failed rollback is not more useful.
    }
    throw error
  }
}

async function withClient<T>(
  options: MigrateOptions,
  fn: (client: Queryable) => Promise<T>,
): Promise<T> {
  if (options.pool) {
    const client = await options.pool.connect()
    try {
      return await fn(client)
    }
    finally {
      client.release()
    }
  }

  const client = new pg.Client(toClientConfig(options))
  await client.connect()
  try {
    return await fn(client)
  }
  finally {
    await client.end()
  }
}

function postgresDatabaseLabel(name: string | undefined): string {
  const trimmed = name?.trim()
  return trimmed ? `PostgreSQL database «${trimmed}»` : 'PostgreSQL database'
}

function logMigrationResult(result: MigrationResult, database: string): void {
  for (const id of result.applied) {
    console.log(
      id === SCHEMA_ID
        ? `[KateCMS] The ${database} has been imported successfully.`
        : `[KateCMS] Schema «${id}» imported successfully into the ${database}.`,
    )
  }
  for (const id of result.alreadyApplied) {
    console.log(
      id === SCHEMA_ID
        ? `[KateCMS] The ${database} has already been imported previously.`
        : `[KateCMS] Schema «${id}» has already been imported previously into the ${database}.`,
    )
  }
}

export async function migratePostgres(input: string | MigrateOptions): Promise<MigrationResult> {
  const options = resolveOptions(input)
  if (!options.pool && !hasConnectionConfig(options)) {
    throw new Error(
      '[KateCMS] migratePostgres() needs a database connection: pass a URL string, `connectionString`, host/database credentials, or an existing `pool`.',
    )
  }

  const { database, ...result } = await withClient(
    options,
    client => applySchemas(client, resolveExtraSchema(options)),
  )
  logMigrationResult(result, postgresDatabaseLabel(database))
  return result
}
