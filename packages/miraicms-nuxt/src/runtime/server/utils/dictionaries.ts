import { useRuntimeConfig } from '#imports'
import {
  buildSlugPathMap,
  flattenCollectionTree,
  formatRequiredFieldsError,
  isUniqueConstraintError,
  listDictionaries,
  listDictionariesByCollection,
  setCollectionDictionaries,
  validateRequiredFields,
} from '@miraicms/core'
import type {
  Database,
  Dictionaries,
  Dictionary,
  DictionaryDefinition,
  Fields,
} from '@miraicms/core'
import type { Kysely } from 'kysely'
import type { CollectionDictionaryPicker, PublicDictionaryTerm } from '../../utils/collections'
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
    multiple: def.multiple === true,
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

export function toPublicTerm(row: Dictionary, slugPath: string): PublicDictionaryTerm {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    slugPath: slugPath || row.slug,
    title: row.title,
    fields: (row.fields ?? {}) as Record<string, unknown>,
    parentId: row.parent_id,
  }
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

export function dictionariesForCollection(collectionSlug: string): Array<{ slug: string, def: DictionaryDefinition }> {
  return Object.entries(getDictionaries())
    .filter(([, def]) => def.collections.includes(collectionSlug))
    .map(([slug, def]) => ({ slug, def }))
}

export async function loadCollectionDictionaryPickers(
  db: Kysely<Database>,
  collectionSlug: string,
): Promise<CollectionDictionaryPicker[]> {
  const attached = dictionariesForCollection(collectionSlug)
  const pickers: CollectionDictionaryPicker[] = []
  for (const { slug, def } of attached) {
    const rows = await listDictionaries(db, slug)
    pickers.push({
      slug,
      labels: {
        name: def.labels.name,
        singularName: def.labels.singularName ?? def.labels.name,
      },
      multiple: def.multiple === true,
      terms: listDictionaryParentOptions(rows),
    })
  }
  return pickers
}

/** Assigned terms for a public entry, keyed by dictionary slug (empty arrays when none). */
export async function loadAssignedEntryDictionaries(
  db: Kysely<Database>,
  collectionId: number,
  collectionSlug: string,
): Promise<Record<string, PublicDictionaryTerm[]>> {
  const attached = dictionariesForCollection(collectionSlug)
  const grouped: Record<string, PublicDictionaryTerm[]> = Object.fromEntries(
    attached.map(({ slug }) => [slug, [] as PublicDictionaryTerm[]]),
  )
  if (attached.length === 0) {
    return grouped
  }

  const allowed = new Set(attached.map(({ slug }) => slug))
  const linked = (await listDictionariesByCollection(db, collectionId))
    .filter(term => allowed.has(term.type))
  if (linked.length === 0) {
    return grouped
  }

  const typesNeeded = [...new Set(linked.map(term => term.type))]
  const typeRows = await Promise.all(typesNeeded.map(type => listDictionaries(db, type)))
  const pathMaps = new Map(typesNeeded.map((type, index) => [
    type,
    buildSlugPathMap(typeRows[index]),
  ]))

  for (const term of linked) {
    grouped[term.type].push(toPublicTerm(term, pathMaps.get(term.type)?.get(term.id) ?? term.slug))
  }
  return grouped
}

export async function selectedDictionaryIds(
  db: Kysely<Database>,
  collectionId: number,
  pickers: CollectionDictionaryPicker[],
): Promise<Record<string, number[]>> {
  const ids: Record<string, number[]> = Object.fromEntries(
    pickers.map(picker => [picker.slug, [] as number[]]),
  )
  if (pickers.length === 0) {
    return ids
  }
  const allowed = new Set(pickers.map(picker => picker.slug))
  const linked = await listDictionariesByCollection(db, collectionId)
  for (const term of linked) {
    if (!allowed.has(term.type)) {
      continue
    }
    ids[term.type].push(term.id)
  }
  return ids
}

function readTermIdList(value: unknown): number[] {
  if (value === undefined || value === null || value === '') {
    return []
  }
  const raw = Array.isArray(value) ? value : [value]
  const ids: number[] = []
  const seen = new Set<number>()
  for (const item of raw) {
    const id = typeof item === 'number' ? item : Number(item)
    if (!Number.isInteger(id) || id <= 0) {
      fail(422, 'Invalid dictionary term.')
    }
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    ids.push(id)
  }
  return ids
}

export function readDictionaryAssignments(
  value: unknown,
  pickers: CollectionDictionaryPicker[],
): Record<string, number[]> {
  if (value === undefined || value === null) {
    return Object.fromEntries(pickers.map(picker => [picker.slug, [] as number[]]))
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    fail(422, 'Invalid dictionary selection.')
  }
  const raw = value as Record<string, unknown>
  const allowed = new Set(pickers.map(picker => picker.slug))
  for (const slug of Object.keys(raw)) {
    if (!allowed.has(slug)) {
      fail(422, 'Unknown dictionary.')
    }
  }
  const assigned: Record<string, number[]> = {}
  for (const picker of pickers) {
    const termIds = new Set(picker.terms.map(term => term.id))
    const selected = readTermIdList(raw[picker.slug])
    for (const id of selected) {
      if (!termIds.has(id)) {
        fail(422, 'Invalid dictionary term.')
      }
    }
    if (!picker.multiple && selected.length > 1) {
      fail(422, `Only one ${picker.labels.singularName.toLowerCase()} can be selected.`)
    }
    assigned[picker.slug] = selected
  }
  return assigned
}

export async function applyDictionaryAssignments(
  db: Kysely<Database>,
  collectionId: number,
  collectionSlug: string,
  value: unknown,
): Promise<Record<string, number[]>> {
  const pickers = await loadCollectionDictionaryPickers(db, collectionSlug)
  if (pickers.length === 0) {
    return {}
  }
  const assigned = readDictionaryAssignments(value, pickers)
  const linked = await listDictionariesByCollection(db, collectionId)
  const replaceTypes = new Set(pickers.map(picker => picker.slug))
  const keep = linked.filter(term => !replaceTypes.has(term.type)).map(term => term.id)
  const next = [...keep, ...Object.values(assigned).flat()]
  await setCollectionDictionaries(db, collectionId, next)
  return assigned
}
