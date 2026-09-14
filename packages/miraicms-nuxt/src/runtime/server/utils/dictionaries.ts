import { useRuntimeConfig } from '#imports'
import {
  buildSlugPathMap,
  flattenCollectionTree,
  formatRequiredFieldsError,
  isUniqueConstraintError,
  validateRequiredFields,
} from '@miraicms/core'
import type {
  Dictionaries,
  Dictionary,
  DictionaryDefinition,
  Fields,
} from '@miraicms/core'
import type {
  AdminDictionaryMeta,
  AdminDictionaryTerm,
  ParentOption,
} from '../../utils/dictionaries'
import {
  fail,
  readEntryId,
  readFields,
  readParentId,
  readSlug,
  readTitle,
} from './collections'

export { fail, readEntryId, readFields, readParentId, readSlug, readTitle }

export function getDictionaries(): Dictionaries {
  return useRuntimeConfig().miraicms?.dictionaries ?? {}
}

export function getDictionaryDefinition(slug: string): DictionaryDefinition | undefined {
  return getDictionaries()[slug]
}

export function requireDictionary(slug: string): DictionaryDefinition {
  const dictionary = getDictionaryDefinition(slug)
  if (!dictionary) {
    fail(404, 'Dictionary not found.')
  }
  return dictionary
}

export function toDictionaryMeta(slug: string, def: DictionaryDefinition): AdminDictionaryMeta {
  return {
    slug,
    labels: {
      name: def.labels.name,
      singularName: def.labels.singularName ?? def.labels.name,
    },
    fields: (def.fields ?? {}) as Fields,
    collections: [...def.collections],
  }
}

function toIso(value: Date | string | null | undefined): string {
  if (value == null) {
    return new Date(0).toISOString()
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date(0).toISOString() : value.toISOString()
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}

export function toAdminTerm(
  row: Dictionary,
  slugPath: string,
  flags?: { canUpdate?: boolean, canDelete?: boolean, depth?: number },
): AdminDictionaryTerm {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    slugPath: slugPath || row.slug,
    title: row.title,
    fields: (row.fields ?? {}) as Record<string, unknown>,
    parentId: row.parent_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    ...flags,
  }
}

export function toParentOption(row: {
  id: number
  title: string
  slug: string
  parent_id: number | null
  slugPath: string
  depth: number
}): ParentOption {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    parentId: row.parent_id,
    slugPath: row.slugPath,
    depth: row.depth,
  }
}

export function readDictionarySlug(raw: string | undefined): string {
  const slug = typeof raw === 'string' ? raw.trim() : ''
  if (!slug) {
    fail(400, 'Dictionary is required.')
  }
  return slug
}

export function requireTermFields(
  def: DictionaryDefinition,
  fields: Record<string, unknown>,
): void {
  const issues = validateRequiredFields(def.fields ?? {}, fields)
  if (issues.length > 0) {
    fail(422, formatRequiredFieldsError(issues))
  }
}

function descendantIds(
  rows: Array<{ id: number, parent_id: number | null }>,
  rootId: number,
): Set<number> {
  const children = new Map<number, number[]>()
  for (const row of rows) {
    if (row.parent_id == null) {
      continue
    }
    const list = children.get(row.parent_id) ?? []
    list.push(row.id)
    children.set(row.parent_id, list)
  }
  const out = new Set<number>()
  const stack = [...(children.get(rootId) ?? [])]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (out.has(id)) {
      continue
    }
    out.add(id)
    stack.push(...(children.get(id) ?? []))
  }
  return out
}

export function listDictionaryParentOptions(
  rows: Array<{ id: number, title: string, slug: string, parent_id: number | null }>,
  excludeId?: number,
): ParentOption[] {
  const blocked = excludeId === undefined
    ? new Set<number>()
    : descendantIds(rows, excludeId)
  if (excludeId !== undefined) {
    blocked.add(excludeId)
  }
  const visible = rows.filter(row => !blocked.has(row.id))
  const paths = buildSlugPathMap(visible)
  return flattenCollectionTree(visible).map(({ row, depth }) => toParentOption({
    ...row,
    slugPath: paths.get(row.id) ?? row.slug,
    depth,
  }))
}

export function flattenDictionaryTerms(
  rows: Dictionary[],
): Array<{ row: Dictionary, depth: number, slugPath: string }> {
  const paths = buildSlugPathMap(rows)
  return flattenCollectionTree(rows).map(({ row, depth }) => ({
    row,
    depth,
    slugPath: paths.get(row.id) ?? row.slug,
  }))
}

export function assertDictionaryParent(
  rows: Array<{ id: number, type: string, parent_id: number | null }>,
  type: string,
  parentId: number | null,
  excludeId?: number,
): void {
  if (parentId == null) {
    return
  }
  const parent = rows.find(row => row.id === parentId)
  if (!parent || parent.type !== type) {
    fail(422, 'Invalid parent.')
  }
  if (excludeId !== undefined && parentId === excludeId) {
    fail(422, 'Invalid parent.')
  }
  if (excludeId !== undefined) {
    const blocked = descendantIds(rows, excludeId)
    if (blocked.has(parentId)) {
      fail(422, 'Invalid parent.')
    }
  }
}

export function rethrowDictionaryWriteError(error: unknown): never {
  if (isUniqueConstraintError(error)) {
    fail(409, 'A term with this slug already exists.')
  }
  const message = error instanceof Error ? error.message : ''
  if (
    /parent/i.test(message)
    || /descendant/i.test(message)
    || /hierarchy/i.test(message)
  ) {
    fail(422, message.startsWith('dictionaries:') ? 'Invalid parent.' : message)
  }
  throw error
}
