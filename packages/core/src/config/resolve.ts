import type { MiraiCmsConfig, ResolvedMiraiCmsConfig } from './types'
import { mergeMiraiCmsConfig } from './merge'
import { resolveDatabaseConfig } from './resolve-database'
import { resolveMediaConfig } from './resolve-media'
import { resolveRoles } from './resolve-roles'

/** Merge user CMS config with defaults, then resolve roles, media, and database. */
export function resolveMiraiCmsConfig(config: MiraiCmsConfig = {}): ResolvedMiraiCmsConfig {
  const merged = mergeMiraiCmsConfig(config)
  const roles = resolveRoles(merged.roles)
  const media = resolveMediaConfig(merged.media)
  const database = resolveDatabaseConfig(merged.database)

  return {
    adminPath: merged.adminPath,
    loginPath: merged.loginPath,
    registerPath: merged.registerPath,
    collections: merged.collections,
    dictionaries: merged.dictionaries,
    options: merged.options,
    blocks: merged.blocks,
    database: database.database,
    media: media.media,
    roles: roles.roles,
    warnings: [...roles.warnings, ...media.warnings, ...database.warnings],
  }
}
