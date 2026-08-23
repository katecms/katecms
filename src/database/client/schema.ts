import type { ColumnType, Generated } from 'kysely'

/**
 * Kysely types for the CMS tables.
 *
 * Canonical DDL lives in `migrations/postgres/schema.ts` and `migrations/sqlite/schema.ts`.
 * The `.sql` files next to them are generated copies for reading. Keep all three in sync
 * when the schema changes: schema.ts (source), the `.sql` copy, and this file.
 *
 * Select types describe the shared JS shape: `Date`, parsed JSON, `boolean`.
 * SQLite/D1 store dates as ISO text, JSON as text, and `autoload` as 0/1;
 * `createSqliteDb()` maps those to this shape.
 */

/** timestamptz / ISO text: read as `Date` from Postgres, written as `Date` or string. */
type Timestamp = ColumnType<Date, Date | string, Date | string>

/**
 * jsonb / JSON text. `pg` parses jsonb; SQLite/D1 text is parsed by the client plugin.
 */
type Json<T = unknown> = ColumnType<T, T, T>

export type UserStatus = 'active' | 'banned'
export type CollectionStatus = 'published' | 'draft' | 'trash'
export type MediaVariantsStatus = 'none' | 'pending' | 'ready' | 'failed'

export interface UsersTable {
  id: Generated<number>
  email: string
  password_hash: string
  name: string | null
  avatar: Json | null
  role: Generated<string>
  status: Generated<UserStatus>
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface CollectionsTable {
  id: Generated<number>
  type: string
  status: Generated<CollectionStatus>
  slug: string
  title: string
  fields: Generated<Json<Record<string, unknown>>>
  blocks: Generated<Json<unknown[]>>
  author_id: number | null
  parent_id: number | null
  menu_order: Generated<number>
  password_hash: string | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
  published_at: Timestamp | null
}

export interface CollectionMetaTable {
  collection_id: number
  key: string
  value: Json | null
}

export interface CollectionRevisionsTable {
  id: Generated<number>
  collection_id: number
  author_id: number | null
  data: Json
  created_at: Generated<Timestamp>
}

export interface MediaTable {
  id: Generated<number>
  filename: string
  mime_type: string
  filesize: number
  width: number | null
  height: number | null
  alt: string | null
  caption: string | null
  uploaded_by: number | null
  variants: Generated<Json<unknown[]>>
  variants_status: Generated<MediaVariantsStatus>
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface DictionariesTable {
  id: Generated<number>
  slug: string
  title: string
  type: string
  fields: Generated<Json<Record<string, unknown>>>
  parent_id: number | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface CollectionDictionariesTable {
  collection_id: number
  dictionary_id: number
}

export interface OptionsTable {
  key: string
  value: Json | null
  autoload: Generated<boolean>
}

export interface MigrationsTable {
  id: string
  applied_at: Generated<Timestamp>
}

export interface Database {
  users: UsersTable
  collections: CollectionsTable
  collection_meta: CollectionMetaTable
  collection_revisions: CollectionRevisionsTable
  media: MediaTable
  dictionaries: DictionariesTable
  collection_dictionaries: CollectionDictionariesTable
  options: OptionsTable
  _miraicms_migrations: MigrationsTable
}
