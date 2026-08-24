import type { Blocks } from './block'
import type { Collections } from './collection'
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
  media?: MediaConfig
  /**
   * Extend or customise user roles. Built-in roles (`owner`, `admin`, `editor`,
   * `author`, `subscriber`) are always available; entries here add new roles,
   * override a built-in role's rights, or hide one with `false`. The `owner`
   * role is reserved and cannot be changed.
   */
  roles?: Roles
}

/** CMS config after defaults, role merge, and media normalisation. */
export interface ResolvedMiraiCmsConfig {
  adminPath: string
  loginPath: string
  registerPath: string
  collections: Collections
  taxonomies: Taxonomies
  blocks: Blocks
  media: ResolvedMediaConfig
  roles: Record<string, ResolvedRole>
  warnings: string[]
}
