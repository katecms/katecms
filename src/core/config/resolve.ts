import type { MiraiCmsConfig, ResolvedMiraiCmsConfig } from './types'
import { defaults } from './defaults'
import { resolveMediaConfig } from './resolve-media'
import { resolveRoles } from './resolve-roles'

/** Merge user CMS config with defaults, resolve roles and media. */
export function resolveMiraiCmsConfig(config: MiraiCmsConfig = {}): ResolvedMiraiCmsConfig {
  const roles = resolveRoles(config.roles)
  const media = resolveMediaConfig(config.media)

  return {
    adminPath: config.adminPath ?? defaults.adminPath!,
    loginPath: config.loginPath ?? defaults.loginPath!,
    registerPath: config.registerPath ?? defaults.registerPath!,
    collections: config.collections ?? {},
    taxonomies: config.taxonomies ?? {},
    blocks: config.blocks ?? {},
    media: media.media,
    roles: roles.roles,
    warnings: [...roles.warnings, ...media.warnings],
  }
}
