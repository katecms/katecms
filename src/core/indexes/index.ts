export type {
  ActualFieldIndex,
  ApplyFieldIndexDiffResult,
  DesiredFieldIndex,
  IndexSyncChange,
  IndexSyncDiff,
} from './types'
export {
  FIELD_INDEX_TABLE,
  INDEX_NAME_PREFIX,
  INDEX_NAME_SUFFIX,
  buildCreateIndexSql,
  buildDropIndexSql,
  buildIndexExpression,
  buildIndexName,
  collectDesiredFieldIndexes,
  computeIndexDiff,
  escapeSqlString,
  extractExpressionFromIndexDef,
  getPostgresCast,
  indexDefinitionsMatch,
  isManagedFieldIndexName,
  isSafeIdentifier,
  normalizeIndexExpression,
} from './definitions'
export {
  FIELD_INDEX_LOCK_KEY,
  applyFieldIndexDiff,
  loadActualFieldIndexes,
} from './apply'
