import type { Blocks } from './block'
import type { Collections } from './collection'
import type { DatabaseConfig, ResolvedDatabaseConfig } from './database'
import type { MediaConfig, ResolvedMediaConfig } from './media'
import type { ResolvedRole, Roles } from './roles'
import type { Taxonomies } from './taxonomy'

/** User-facing CMS configuration (framework-agnostic). */
export interface MiraiCmsConfig {
  adminPath?: string
  loginPath?: string
  registerPath?: string
  collections?: Collections
  taxonomies?: Taxonomies
  blocks?: Blocks
  /**
   * Database connection. Default is SQLite at `data/miraicms.db`.
   *
   * @example
   * { driver: 'postgres', url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms' }
   */
  database?: DatabaseConfig
  media?: MediaConfig
  /**
   * Extend or customise user roles. Built-in roles (`owner`, `admin`, `editor`,
   * `author`, `subscriber`) are always available; entries here add new roles,
   * override a built-in role's rights, or hide one with `false`. The `owner`
   * role is reserved and cannot be changed.
   */
  roles?: Roles
}

/** CMS config after defaults, role merge, media and database normalisation. */
export interface ResolvedMiraiCmsConfig {
  adminPath: string
  loginPath: string
  registerPath: string
  collections: Collections
  taxonomies: Taxonomies
  blocks: Blocks
  database: ResolvedDatabaseConfig
  media: ResolvedMediaConfig
  roles: Record<string, ResolvedRole>
  warnings: string[]
}
