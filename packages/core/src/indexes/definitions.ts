import type { Collections } from '../config/types/collection'
import type { Field, Fields } from '../config/types/fields'
import type {
  ActualFieldIndex,
  DesiredFieldIndex,
  IndexSyncChange,
  IndexSyncDiff,
} from './types'

export const FIELD_INDEX_TABLE = 'collections'
/** Trailing `__` so `{collection}` / `{path}` segments cannot fuse with the prefix. */
export const INDEX_NAME_PREFIX = 'collections_fld__'
export const INDEX_NAME_SUFFIX = '_idx'
/** PostgreSQL identifier length limit (bytes). */
export const MAX_INDEX_NAME_BYTES = 63

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

const NESTED_OBJECT_TYPES = new Set(['group'])
const HOIST_PANEL_TYPES = new Set(['tab', 'accordion'])
const SKIP_NEST_TYPES = new Set(['repeater', 'flexible_content'])
/** Inserted after the collection slug so a nested path cannot look like a root field. */
const NESTED_INDEX_MARKER = 'n'

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

/**
 * Build the btree expression for a JSONB scalar at `fieldPath`.
 * Root field `title` → `(fields->>'title')`.
 * Nested `seo.title` → `(fields->'seo'->>'title')`.
 */
export function buildIndexExpression(fieldPath: string | string[], fieldType: string): string {
  const path = Array.isArray(fieldPath) ? fieldPath : [fieldPath]
  if (path.length === 0) {
    throw new Error('Index field path must not be empty.')
  }
  const escaped = path.map(segment => escapeSqlString(segment))
  const json = escaped.length === 1
    ? `fields->>'${escaped[0]}'`
    : `fields${escaped.slice(0, -1).map(segment => `->'${segment}'`).join('')}->>'${escaped[escaped.length - 1]}'`
  const cast = getPostgresCast(fieldType)
  if (cast) {
    return `((${json})::${cast})`
  }
  return `(${json})`
}

/**
 * Root field: `collections_fld__{collection}__{field}_idx`.
 * Nested field: `collections_fld__{collection}__n__{seg}__{seg}_idx`
 * so the name cannot be mistaken for a parent-level index.
 */
export function buildIndexName(collectionSlug: string, fieldPath: string | string[]): string {
  const path = Array.isArray(fieldPath) ? fieldPath : [fieldPath]
  const segments = path.length > 1
    ? [collectionSlug, NESTED_INDEX_MARKER, ...path]
    : [collectionSlug, ...path]
  return `${INDEX_NAME_PREFIX}${segments.join('__')}${INDEX_NAME_SUFFIX}`
}

/**
 * Parse a name produced by {@link buildIndexName}.
 * Returns null when the name is not a core-managed field index.
 */
export function parseManagedFieldIndexName(indexName: string): {
  collectionSlug: string
  fieldPath: string[]
} | null {
  if (!indexName.startsWith(INDEX_NAME_PREFIX) || !indexName.endsWith(INDEX_NAME_SUFFIX)) {
    return null
  }
  const body = indexName.slice(INDEX_NAME_PREFIX.length, indexName.length - INDEX_NAME_SUFFIX.length)
  const parts = body.split('__')
  if (parts.length < 2 || parts.some(part => !part || !isSafeIdentifier(part))) {
    return null
  }
  const collectionSlug = parts[0]!
  const rest = parts.slice(1)
  const fieldPath = rest[0] === NESTED_INDEX_MARKER && rest.length > 1
    ? rest.slice(1)
    : rest
  return { collectionSlug, fieldPath }
}

export function isManagedFieldIndexName(indexName: string): boolean {
  return parseManagedFieldIndexName(indexName) !== null
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
  pathPrefix: string[],
  desired: DesiredFieldIndex[],
  warnings: string[],
): void {
  if (!fields) {
    return
  }

  for (const [fieldName, field] of Object.entries(fields)) {
    if (HOIST_PANEL_TYPES.has(field.type)) {
      for (const panel of (field as Field & { panels?: Array<{ subFields?: Fields }> }).panels ?? []) {
        collectIndexedFields(panel.subFields, collectionSlug, pathPrefix, desired, warnings)
      }
      continue
    }

    if (NESTED_OBJECT_TYPES.has(field.type)) {
      const group = field as Field & { subFields?: Fields }
      collectIndexedFields(group.subFields, collectionSlug, [...pathPrefix, fieldName], desired, warnings)
      continue
    }

    if (SKIP_NEST_TYPES.has(field.type)) {
      const nested = field as Field & { subFields?: Fields, layouts?: Record<string, { subFields?: Fields }> }
      if (hasIndexedDescendant(nested.subFields) || Object.values(nested.layouts ?? {}).some(layout => hasIndexedDescendant(layout.subFields))) {
        warnings.push(
          `Indexed fields inside "${[...pathPrefix, fieldName].join('.')}" (${field.type}) in collection "${collectionSlug}" were skipped; repeaters and flexible content are not scalar-indexed.`,
        )
      }
      continue
    }

    if (!('indexed' in field) || !field.indexed) {
      continue
    }

    const fieldPath = [...pathPrefix, fieldName]
    const pathLabel = fieldPath.join('.')

    if (!isSafeIdentifier(collectionSlug) || fieldPath.some(segment => !isSafeIdentifier(segment))) {
      warnings.push(
        `Skipped field "${pathLabel}" in collection "${collectionSlug}": slug/name must match /^[a-zA-Z_][a-zA-Z0-9_]*$/.`,
      )
      continue
    }

    if (!INDEXABLE_SCALAR_TYPES.has(field.type)) {
      warnings.push(
        `Field "${pathLabel}" (${field.type}) in collection "${collectionSlug}" does not support scalar indexing and was skipped.`,
      )
      continue
    }

    const indexName = buildIndexName(collectionSlug, fieldPath)
    if (Buffer.byteLength(indexName, 'utf8') > MAX_INDEX_NAME_BYTES) {
      throw new Error(
        `Field index name exceeds ${MAX_INDEX_NAME_BYTES} bytes: ${indexName}`,
      )
    }

    desired.push({
      collectionSlug,
      fieldName,
      fieldPath,
      fieldType: field.type,
      indexName,
      expression: buildIndexExpression(fieldPath, field.type),
    })
  }
}

function hasIndexedDescendant(fields: Fields | undefined): boolean {
  if (!fields) {
    return false
  }
  for (const field of Object.values(fields)) {
    if ('indexed' in field && field.indexed) {
      return true
    }
    if ('subFields' in field && hasIndexedDescendant(field.subFields)) {
      return true
    }
    if ('layouts' in field) {
      for (const layout of Object.values(field.layouts ?? {})) {
        if (hasIndexedDescendant(layout.subFields)) {
          return true
        }
      }
    }
    if ('panels' in field) {
      for (const panel of field.panels ?? []) {
        if (hasIndexedDescendant(panel.subFields)) {
          return true
        }
      }
    }
  }
  return false
}

/** Walk collection field configs and collect every `indexed: true` scalar field. */
export function collectDesiredFieldIndexes(collections: Collections): {
  desired: DesiredFieldIndex[]
  warnings: string[]
} {
  const desired: DesiredFieldIndex[] = []
  const warnings: string[] = []

  for (const [collectionSlug, collection] of Object.entries(collections)) {
    collectIndexedFields(collection.fields, collectionSlug, [], desired, warnings)
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

function toCreateChange(desiredIndex: DesiredFieldIndex): IndexSyncChange {
  return {
    indexName: desiredIndex.indexName,
    collectionSlug: desiredIndex.collectionSlug,
    fieldName: desiredIndex.fieldName,
    fieldPath: desiredIndex.fieldPath,
    fieldType: desiredIndex.fieldType,
    action: 'create',
    sql: buildCreateIndexSql(desiredIndex),
  }
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
    if (!isManagedFieldIndexName(indexName)) {
      continue
    }

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
      changes.push(toCreateChange(desiredIndex))
    }
  }

  for (const [indexName, desiredIndex] of desiredByName) {
    if (actualByName.has(indexName)) {
      continue
    }
    toCreate.push(desiredIndex)
    changes.push(toCreateChange(desiredIndex))
  }

  return {
    hasChanges: changes.length > 0,
    toCreate,
    toDrop,
    changes,
  }
}
