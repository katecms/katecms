import type { Collections, Fields } from '../config'
import type {
  ActualFieldIndex,
  DesiredFieldIndex,
  IndexSyncChange,
  IndexSyncDiff,
} from './types'

export const FIELD_INDEX_TABLE = 'collections'
export const INDEX_NAME_PREFIX = 'collections_fld_'
export const INDEX_NAME_SUFFIX = '_idx'

/** Field types that can be indexed as scalar JSONB text extractions. */
const INDEXABLE_SCALAR_TYPES = new Set([
  'text',
  'textarea',
  'number',
  'range',
  'email',
  'url',
  'select',
  'radio',
  'button_group',
  'true_false',
  'date_picker',
  'date_time_picker',
  'time_picker',
  'color_picker',
])

const STRUCTURAL_FIELD_TYPES = new Set([
  'group',
  'repeater',
  'flexible_content',
  'clone',
  'accordion',
  'tab',
  'message',
  'separator',
])

/** Slugs and field keys must be safe PostgreSQL identifier fragments. */
export function isSafeIdentifier(value: string): boolean {
  return /^[a-z_]\w*$/i.test(value)
}

/** Escape a string literal for embedding inside single-quoted SQL. */
export function escapeSqlString(value: string): string {
  return value.replace(/'/g, '\'\'')
}

/** Map a field type to a PostgreSQL cast suffix, or `null` for plain text. */
export function getPostgresCast(fieldType: string): string | null {
  switch (fieldType) {
    case 'number':
    case 'range':
      return 'numeric'
    case 'true_false':
      return 'boolean'
    case 'date_picker':
      return 'date'
    case 'date_time_picker':
      return 'timestamptz'
    case 'time_picker':
      return 'time'
    default:
      return null
  }
}

/** Build the btree expression for a JSONB scalar field. */
export function buildIndexExpression(fieldName: string, fieldType: string): string {
  const escapedField = escapeSqlString(fieldName)
  const cast = getPostgresCast(fieldType)
  if (cast) {
    return `((fields->>'${escapedField}')::${cast})`
  }
  return `(fields->>'${escapedField}')`
}

/** `collections_fld_{collection}_{field}_idx` */
export function buildIndexName(collectionSlug: string, fieldName: string): string {
  return `${INDEX_NAME_PREFIX}${collectionSlug}_${fieldName}${INDEX_NAME_SUFFIX}`
}

export function isManagedFieldIndexName(indexName: string): boolean {
  return indexName.startsWith(INDEX_NAME_PREFIX) && indexName.endsWith(INDEX_NAME_SUFFIX)
}

/** Full `CREATE INDEX` DDL for one desired index definition. */
export function buildCreateIndexSql(defn: DesiredFieldIndex): string {
  const escapedType = escapeSqlString(defn.collectionSlug)
  return `CREATE INDEX IF NOT EXISTS ${defn.indexName} ON ${FIELD_INDEX_TABLE} (${defn.expression}) WHERE type = '${escapedType}'`
}

/** Full `DROP INDEX` DDL for a managed index. */
export function buildDropIndexSql(indexName: string): string {
  return `DROP INDEX IF EXISTS ${indexName}`
}

function collectIndexedFields(
  fields: Fields | undefined,
  collectionSlug: string,
  desired: DesiredFieldIndex[],
  warnings: string[],
): void {
  if (!fields) {
    return
  }

  for (const [fieldName, field] of Object.entries(fields)) {
    if (!('indexed' in field) || !field.indexed) {
      continue
    }

    if (!isSafeIdentifier(collectionSlug) || !isSafeIdentifier(fieldName)) {
      warnings.push(
        `Skipped field "${fieldName}" in collection "${collectionSlug}": slug/name must match /^[a-zA-Z_][a-zA-Z0-9_]*$/.`,
      )
      continue
    }

    if (STRUCTURAL_FIELD_TYPES.has(field.type) || !INDEXABLE_SCALAR_TYPES.has(field.type)) {
      warnings.push(
        `Field "${fieldName}" (${field.type}) in collection "${collectionSlug}" does not support scalar indexing and was skipped.`,
      )
      continue
    }

    desired.push({
      collectionSlug,
      fieldName,
      fieldType: field.type,
      indexName: buildIndexName(collectionSlug, fieldName),
      expression: buildIndexExpression(fieldName, field.type),
    })
  }
}

/** Walk collection field configs and collect every `indexed: true` scalar field. */
export function collectDesiredFieldIndexes(collections: Collections): {
  desired: DesiredFieldIndex[]
  warnings: string[]
} {
  const desired: DesiredFieldIndex[] = []
  const warnings: string[] = []

  for (const [collectionSlug, collection] of Object.entries(collections)) {
    collectIndexedFields(collection.fields, collectionSlug, desired, warnings)
  }

  return { desired, warnings }
}

/** Normalize an index expression for comparison against `pg_indexes.indexdef`. */
export function normalizeIndexExpression(expression: string): string {
  return expression
    .replace(/\s+/g, '')
    .replace(/::text/g, '')
    .replace(/[()]/g, '')
    .toLowerCase()
}

/** Extract the indexed expression from a `pg_indexes.indexdef` value. */
export function extractExpressionFromIndexDef(indexDef: string): string | null {
  const match = indexDef.match(/USING\s+\w+\s*\((.+)\)\s+WHERE/i)
  return match?.[1] ?? null
}

/** Whether an existing index definition matches the desired expression. */
export function indexDefinitionsMatch(indexDef: string, expectedExpression: string): boolean {
  const actualExpression = extractExpressionFromIndexDef(indexDef)
  if (!actualExpression) {
    return false
  }
  return normalizeIndexExpression(actualExpression) === normalizeIndexExpression(expectedExpression)
}

/** Compare config-derived indexes with the PostgreSQL catalog. */
export function computeIndexDiff(
  desired: DesiredFieldIndex[],
  actual: ActualFieldIndex[],
): IndexSyncDiff {
  const desiredByName = new Map(desired.map(item => [item.indexName, item]))
  const actualByName = new Map(actual.map(item => [item.indexName, item]))

  const toDrop: ActualFieldIndex[] = []
  const toCreate: DesiredFieldIndex[] = []
  const changes: IndexSyncChange[] = []

  for (const [indexName, actualIndex] of actualByName) {
    const desiredIndex = desiredByName.get(indexName)
    if (!desiredIndex) {
      toDrop.push(actualIndex)
      changes.push({
        indexName,
        action: 'drop',
        sql: buildDropIndexSql(indexName),
      })
      continue
    }

    if (!indexDefinitionsMatch(actualIndex.indexDef, desiredIndex.expression)) {
      toDrop.push(actualIndex)
      toCreate.push(desiredIndex)
      changes.push({
        indexName,
        action: 'drop',
        sql: buildDropIndexSql(indexName),
      })
      changes.push({
        indexName,
        collectionSlug: desiredIndex.collectionSlug,
        fieldName: desiredIndex.fieldName,
        fieldType: desiredIndex.fieldType,
        action: 'create',
        sql: buildCreateIndexSql(desiredIndex),
      })
    }
  }

  for (const [indexName, desiredIndex] of desiredByName) {
    if (actualByName.has(indexName)) {
      continue
    }
    toCreate.push(desiredIndex)
    changes.push({
      indexName,
      collectionSlug: desiredIndex.collectionSlug,
      fieldName: desiredIndex.fieldName,
      fieldType: desiredIndex.fieldType,
      action: 'create',
      sql: buildCreateIndexSql(desiredIndex),
    })
  }

  return {
    hasChanges: changes.length > 0,
    toCreate,
    toDrop,
    changes,
  }
}
