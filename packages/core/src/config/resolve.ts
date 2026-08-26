import type { Blocks, Collections, Fields, MiraiCmsConfig, ResolvedMiraiCmsConfig, Taxonomies } from './types'
import { defaults } from './defaults'
import { resolveCloneFields } from '../fields'
import { resolveDatabaseConfig } from './resolve-database'
import { resolveMediaConfig } from './resolve-media'
import { resolveRoles } from './resolve-roles'

function resolveFieldsTree(fields: Fields | undefined, warnings: string[]): Fields | undefined {
  if (!fields) {
    return fields
  }
  const resolved = resolveCloneFields(fields)
  warnings.push(...resolved.warnings)
  return resolved.fields
}

function resolveCollectionFields(collections: Collections, warnings: string[]): Collections {
  const result: Collections = {}
  for (const [slug, definition] of Object.entries(collections)) {
    result[slug] = {
      ...definition,
      fields: resolveFieldsTree(definition.fields, warnings),
    }
  }
  return result
}

function resolveTaxonomyFields(taxonomies: Taxonomies, warnings: string[]): Taxonomies {
  const result: Taxonomies = {}
  for (const [slug, definition] of Object.entries(taxonomies)) {
    result[slug] = {
      ...definition,
      fields: resolveFieldsTree(definition.fields, warnings),
    }
  }
  return result
}

function resolveBlockFields(blocks: Blocks, warnings: string[]): Blocks {
  const result: Blocks = {}
  for (const [slug, definition] of Object.entries(blocks)) {
    result[slug] = {
      ...definition,
      fields: resolveFieldsTree(definition.fields, warnings),
    }
  }
  return result
}

/** Merge user CMS config with defaults, resolve roles, media, database, and clone fields. */
export function resolveMiraiCmsConfig(config: MiraiCmsConfig = {}): ResolvedMiraiCmsConfig {
  const roles = resolveRoles(config.roles)
  const media = resolveMediaConfig(config.media)
  const database = resolveDatabaseConfig(config.database)
  const cloneWarnings: string[] = []
  const collections = resolveCollectionFields(config.collections ?? {}, cloneWarnings)
  const taxonomies = resolveTaxonomyFields(config.taxonomies ?? {}, cloneWarnings)
  const blocks = resolveBlockFields(config.blocks ?? {}, cloneWarnings)

  return {
    adminPath: config.adminPath ?? defaults.adminPath!,
    loginPath: config.loginPath ?? defaults.loginPath!,
    registerPath: config.registerPath ?? defaults.registerPath!,
    collections,
    taxonomies,
    blocks,
    database: database.database,
    media: media.media,
    roles: roles.roles,
    warnings: [...roles.warnings, ...media.warnings, ...database.warnings, ...cloneWarnings],
  }
}
