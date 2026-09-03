import type { Blocks, Collections, Dictionaries, Fields, MiraiCmsConfig, ResolvedMiraiCmsConfig } from './types'
import { mergeMiraiCmsConfig } from './merge'
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

function resolveDictionaryFields(dictionaries: Dictionaries, warnings: string[]): Dictionaries {
  const result: Dictionaries = {}
  for (const [slug, definition] of Object.entries(dictionaries)) {
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
  const merged = mergeMiraiCmsConfig(config)
  const roles = resolveRoles(merged.roles)
  const media = resolveMediaConfig(merged.media)
  const database = resolveDatabaseConfig(merged.database)
  const cloneWarnings: string[] = []
  const collections = resolveCollectionFields(merged.collections, cloneWarnings)
  const dictionaries = resolveDictionaryFields(merged.dictionaries, cloneWarnings)
  const blocks = resolveBlockFields(merged.blocks, cloneWarnings)

  return {
    adminPath: merged.adminPath,
    loginPath: merged.loginPath,
    registerPath: merged.registerPath,
    collections,
    dictionaries,
    blocks,
    database: database.database,
    media: media.media,
    roles: roles.roles,
    warnings: [...roles.warnings, ...media.warnings, ...database.warnings, ...cloneWarnings],
  }
}
