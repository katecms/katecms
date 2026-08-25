export type {
  CollectionDictionariesTable,
  CollectionMetaTable,
  CollectionRevisionsTable,
  CollectionStatus,
  CollectionsTable,
  Database,
  DictionariesTable,
  MediaTable,
  MediaVariantsStatus,
  MigrationsTable,
  OptionsTable,
  UsersTable,
  UserStatus,
} from './schema'

export { createPostgresDb } from './postgres'
export type { CreatePostgresDbOptions } from './postgres'

export { createSqliteDb } from './sqlite'
export type { CreateSqliteDbOptions } from './sqlite'
export type { D1Database } from './d1-dialect'

export { resolveDatabaseTarget } from './resolve-target'
export type {
  DatabaseTarget,
  ResolveDatabaseTargetInput,
} from './resolve-target'
