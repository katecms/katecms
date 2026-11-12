import type { Blocks } from './block'
import type { Collections } from './collection'
import type { DatabaseConfig, ResolvedDatabaseConfig } from './database'
import type { MediaConfig, ResolvedMediaConfig } from './media'
import type { OptionPages } from './option'
import type { ResolvedRole, Roles } from './roles'
import type { Dictionaries } from './dictionary'
import type { FormConfig, ResolvedFormConfig } from './form'

/** User-facing CMS configuration (framework-agnostic). */
export interface KateCmsConfig {
  adminPath?: string
  loginPath?: string
  registerPath?: string
  /**
   * Self-service registration at `/${adminPath}/${registerPath}`.
   * `true` leaves it open after the first account. `false` blocks every later
   * account. The first account is still created as `owner`. Creating users
   * from the admin is unaffected.
   * Default: `false`.
   */
  registration?: boolean
  collections?: Collections
  dictionaries?: Dictionaries
  /** Singleton settings pages, keyed by slug (`site` → `options.key`). */
  options?: OptionPages
  blocks?: Blocks
  /**
   * Database connection. Default is SQLite at `data/katecms.db`.
   *
   * @example
   * { driver: 'postgres', url: 'postgres://postgres:admin@127.0.0.1:5432/katecms' }
   */
  database?: DatabaseConfig
  media?: MediaConfig
  /**
   * Extend or customise user roles. Built-in roles (`owner`, `admin`, `editor`,
   * `author`, `subscriber`) are always available; entries here add new roles,
   * override a built-in role's rights, or hide one with `false`. `owner` is
   * reserved and cannot be changed. `admin` cannot be hidden.
   */
  roles?: Roles
  /**
   * Form addon. Breakpoints, upload directory, and the max upload size.
   * Used when `katecms-form-builder` is installed.
   */
  form?: FormConfig
}

/** CMS config after defaults, role merge, media and database normalisation. */
export interface ResolvedKateCmsConfig {
  adminPath: string
  loginPath: string
  registerPath: string
  registration: boolean
  collections: Collections
  dictionaries: Dictionaries
  options: OptionPages
  blocks: Blocks
  database: ResolvedDatabaseConfig
  media: ResolvedMediaConfig
  roles: Record<string, ResolvedRole>
  form: ResolvedFormConfig
  warnings: string[]
}
