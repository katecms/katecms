import type { KateCmsConfig, ResolvedKateCmsConfig } from './types'
import { mergeKateCmsConfig } from './merge'
import { resolveDatabaseConfig } from './resolve-database'
import { resolveMediaConfig } from './resolve-media'
import { resolveRoles } from './resolve-roles'
import { resolveFormConfig } from './resolve-form'

/** Merge user CMS config with defaults, then resolve roles, media, database, and forms. */
export function resolveKateCmsConfig(config: KateCmsConfig = {}): ResolvedKateCmsConfig {
  const merged = mergeKateCmsConfig(config)
  const roles = resolveRoles(merged.roles)
  const media = resolveMediaConfig(merged.media)
  const database = resolveDatabaseConfig(merged.database)
  const form = resolveFormConfig(merged.form)

  return {
    adminPath: merged.adminPath,
    loginPath: merged.loginPath,
    registerPath: merged.registerPath,
    registration: merged.registration,
    collections: merged.collections,
    dictionaries: merged.dictionaries,
    options: merged.options,
    blocks: merged.blocks,
    database: database.database,
    media: media.media,
    roles: roles.roles,
    form: form.form,
    warnings: [...roles.warnings, ...media.warnings, ...database.warnings, ...form.warnings],
  }
}
