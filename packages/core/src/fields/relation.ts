import type { MediaItem } from '../media/types'
import type { RelationEntryValue, RelationTermValue } from '../config'

/** Row / object accepted by {@link toRelationEntryValue}. Extra keys are dropped. */
export interface RelationEntrySource {
  id: number
  type: string
  title: string
  slug: string
  slugPath: string
  url: string
  featuredImage?: MediaItem | null
}

/** Row / object accepted by {@link toRelationTermValue}. Extra keys are dropped. */
export interface RelationTermSource {
  id: number
  type: string
  title: string
  slug: string
  slugPath: string
  parentId: number | null
  depth?: number
}

export function isRelationEntryValue(value: unknown): value is RelationEntryValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const entry = value as Partial<RelationEntryValue>
  return typeof entry.id === 'number'
    && Number.isFinite(entry.id)
    && typeof entry.type === 'string'
    && typeof entry.title === 'string'
    && typeof entry.slug === 'string'
    && typeof entry.slugPath === 'string'
    && typeof entry.url === 'string'
}

export function isRelationTermValue(value: unknown): value is RelationTermValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const term = value as Partial<RelationTermValue>
  return typeof term.id === 'number'
    && Number.isFinite(term.id)
    && typeof term.type === 'string'
    && typeof term.title === 'string'
    && typeof term.slug === 'string'
    && typeof term.slugPath === 'string'
    && (term.parentId === null || typeof term.parentId === 'number')
}

/** Extract a select option id from a stored relation value (`id`, object, or numeric string). */
export function relationFieldId(value: unknown): string {
  if (value == null || value === '') {
    return ''
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'object' && !Array.isArray(value) && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? String(id) : ''
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return value
  }
  return ''
}

export function relationFieldIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(relationFieldId).filter(Boolean)
  }
  const id = relationFieldId(value)
  return id ? [id] : []
}

/** Public URL stored by `page_link` (string, `{ url }`, or a relation object). */
export function pageLinkUrl(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'url' in value) {
    const url = (value as { url: unknown }).url
    return typeof url === 'string' ? url.trim() : ''
  }
  return ''
}

export function pageLinkUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(pageLinkUrl).filter(Boolean)
  }
  const url = pageLinkUrl(value)
  return url ? [url] : []
}

export function toRelationEntryValue(entry: RelationEntrySource): RelationEntryValue {
  const next: RelationEntryValue = {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    slug: entry.slug,
    slugPath: entry.slugPath,
    url: entry.url,
  }
  if (entry.featuredImage !== undefined) {
    next.featuredImage = entry.featuredImage
  }
  return next
}

export function toRelationTermValue(term: RelationTermSource): RelationTermValue {
  const next: RelationTermValue = {
    id: term.id,
    type: term.type,
    title: term.title,
    slug: term.slug,
    slugPath: term.slugPath,
    parentId: term.parentId,
  }
  if (term.depth !== undefined) {
    next.depth = term.depth
  }
  return next
}

export function encodeRelationEntryValue(
  entry: RelationEntryValue,
  returnFormat?: 'object' | 'id',
): RelationEntryValue | number {
  return returnFormat === 'id' ? entry.id : toRelationEntryValue(entry)
}

export function encodeRelationTermValue(
  term: RelationTermValue,
  returnFormat?: 'object' | 'id',
): RelationTermValue | number {
  return returnFormat === 'id' ? term.id : toRelationTermValue(term)
}
