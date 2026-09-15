/** A field index that should exist according to the resolved config. */
export interface DesiredFieldIndex {
  collectionSlug: string
  /** Leaf field key (last path segment). */
  fieldName: string
  /** JSON path from `fields` root, e.g. `['seo', 'title']`. */
  fieldPath: string[]
  fieldType: string
  indexName: string
  expression: string
}

/** An index currently present in PostgreSQL. */
export interface ActualFieldIndex {
  indexName: string
  indexDef: string
}

/** Planned DDL change returned by the diff checker. */
export interface IndexSyncChange {
  indexName: string
  collectionSlug?: string
  fieldName?: string
  fieldPath?: string[]
  fieldType?: string
  action: 'create' | 'drop'
  sql: string
}

/** Outcome of comparing config against `pg_indexes`. */
export interface IndexSyncDiff {
  hasChanges: boolean
  toCreate: DesiredFieldIndex[]
  toDrop: ActualFieldIndex[]
  changes: IndexSyncChange[]
}

/** Result of executing {@link IndexSyncDiff} against PostgreSQL. */
export interface ApplyFieldIndexDiffResult {
  created: string[]
  dropped: string[]
}

/** Result of {@link syncCollectionFieldIndexes}. */
export interface SyncCollectionFieldIndexesResult extends ApplyFieldIndexDiffResult {
  warnings: string[]
}
