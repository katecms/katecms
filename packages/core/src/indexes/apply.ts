import { sql } from 'kysely'
import type { Kysely } from 'kysely'
import type { Collections } from '../config/types/collection'
import type { Database } from '../database/client/schema'
import {
  FIELD_INDEX_TABLE,
  INDEX_NAME_PREFIX,
  INDEX_NAME_SUFFIX,
  buildCreateIndexSql,
  buildDropIndexSql,
  buildIndexExpression,
  collectDesiredFieldIndexes,
  computeIndexDiff,
  isManagedFieldIndexName,
} from './definitions'
import type {
  ActualFieldIndex,
  ApplyFieldIndexDiffResult,
  DesiredFieldIndex,
  IndexSyncChange,
  IndexSyncDiff,
  SyncCollectionFieldIndexesResult,
} from './types'

/**
 * Transaction-scoped advisory lock so two adapters cannot sync indexes at once.
 * Arbitrary stable int; not a secret.
 */
export const FIELD_INDEX_LOCK_KEY = 480720

function assertSafeIndexChange(change: IndexSyncChange): void {
  if (!isManagedFieldIndexName(change.indexName)) {
    throw new Error(`Refusing to apply unmanaged index: ${change.indexName}`)
  }

  if (change.action === 'drop') {
    if (change.sql !== buildDropIndexSql(change.indexName)) {
      throw new Error(`Refusing to execute unexpected DROP INDEX SQL for ${change.indexName}`)
    }
    return
  }

  if (!change.collectionSlug || !change.fieldName || !change.fieldType) {
    throw new Error(`Refusing to create index ${change.indexName} without field metadata`)
  }

  const fieldPath = change.fieldPath ?? [change.fieldName]
  const expected: DesiredFieldIndex = {
    collectionSlug: change.collectionSlug,
    fieldName: change.fieldName,
    fieldPath,
    fieldType: change.fieldType,
    indexName: change.indexName,
    expression: buildIndexExpression(fieldPath, change.fieldType),
  }
  if (change.sql !== buildCreateIndexSql(expected)) {
    throw new Error(`Refusing to execute unexpected CREATE INDEX SQL for ${change.indexName}`)
  }
}

/**
 * Load managed field indexes currently present on `collections` (PostgreSQL).
 * SQLite has no `pg_indexes`; adapters should skip sync there.
 */
export async function loadActualFieldIndexes(
  db: Kysely<Database>,
): Promise<ActualFieldIndex[]> {
  const likePrefix = `${INDEX_NAME_PREFIX}%`
  const likeSuffix = `%${INDEX_NAME_SUFFIX}`
  const result = await sql<{ indexname: string, indexdef: string }>`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = ${FIELD_INDEX_TABLE}
      AND indexname LIKE ${likePrefix}
      AND indexname LIKE ${likeSuffix}
    ORDER BY indexname
  `.execute(db)

  return result.rows
    .filter(row => isManagedFieldIndexName(row.indexname))
    .map(row => ({
      indexName: row.indexname,
      indexDef: row.indexdef,
    }))
}

/**
 * Execute a field-index diff against PostgreSQL.
 *
 * Runs inside a transaction with `pg_advisory_xact_lock`. Only SQL produced by
 * {@link computeIndexDiff} for managed index names is accepted.
 * No-op when `diff.hasChanges` is false (does not touch `db`).
 *
 * PostgreSQL only. Adapters must not call this on SQLite.
 */
export async function applyFieldIndexDiff(
  db: Kysely<Database>,
  diff: IndexSyncDiff,
): Promise<ApplyFieldIndexDiffResult> {
  if (!diff.hasChanges) {
    return { created: [], dropped: [] }
  }

  for (const change of diff.changes) {
    assertSafeIndexChange(change)
  }

  const created: string[] = []
  const dropped: string[] = []

  await db.transaction().execute(async (trx) => {
    await sql.raw(`SELECT pg_advisory_xact_lock(${FIELD_INDEX_LOCK_KEY})`).execute(trx)

    for (const change of diff.changes) {
      await sql.raw(change.sql).execute(trx)
      if (change.action === 'create') {
        created.push(change.indexName)
      }
      else {
        dropped.push(change.indexName)
      }
    }
  })

  return { created, dropped }
}

/**
 * Align PostgreSQL field indexes with `indexed: true` in collection config.
 *
 * Collects desired indexes, diffs against `pg_indexes`, then applies the
 * managed create/drop set. PostgreSQL only — adapters must not call this on
 * SQLite.
 */
export async function syncCollectionFieldIndexes(
  db: Kysely<Database>,
  collections: Collections,
): Promise<SyncCollectionFieldIndexesResult> {
  const { desired, warnings } = collectDesiredFieldIndexes(collections)
  const actual = await loadActualFieldIndexes(db)
  const diff = computeIndexDiff(desired, actual)
  const applied = await applyFieldIndexDiff(db, diff)
  return { ...applied, warnings }
}
