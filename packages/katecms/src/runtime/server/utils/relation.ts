import {
  buildPublicPath,
  buildSlugPathMap,
  isImageMedia,
  isMediaItem,
  resolveArchivePath,
  toRelationEntryValue,
} from '@katecms/core'
import type { Collection, CollectionDefinition, MediaItem, RelationEntryValue } from '@katecms/core'

export const RELATION_PICKER_LIMIT = 500

export function readStringList(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []
  return [...new Set(parts.map(item => String(item).trim()).filter(Boolean))]
}

/** First image found in `fields` for the given field keys (`image` or `gallery`). */
export function pickFeaturedImage(fields: unknown, keys: string[]): MediaItem | null {
  if (!keys.length || !fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return null
  }
  const record = fields as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (isMediaItem(value) && isImageMedia(value)) {
      return value
    }
    if (Array.isArray(value)) {
      const image = value.find(item => isMediaItem(item) && isImageMedia(item))
      if (image) {
        return image
      }
    }
  }
  return null
}

export function toPickerEntry(
  row: Collection,
  def: CollectionDefinition,
  slugPath: string,
  extras?: {
    featuredImage?: MediaItem | null
    termIds?: number[]
  },
): RelationEntryValue & { termIds?: number[], featuredImage?: MediaItem | null } {
  const path = slugPath || row.slug
  const entry: RelationEntryValue & { termIds?: number[], featuredImage?: MediaItem | null } = toRelationEntryValue({
    id: row.id,
    type: row.type,
    status: row.status,
    title: row.title,
    slug: row.slug,
    slugPath: path,
    url: def.public === false ? '' : buildPublicPath(def.rewrite, row.type, path),
    fields: row.fields ?? {},
    parentId: row.parent_id,
    menuOrder: row.menu_order,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  })
  if (extras?.featuredImage !== undefined) {
    entry.featuredImage = extras.featuredImage
  }
  if (extras?.termIds) {
    entry.termIds = extras.termIds
  }
  return entry
}

export function collectionArchiveOption(
  slug: string,
  def: CollectionDefinition,
): { url: string, title: string, type: string } | null {
  const url = resolveArchivePath(def, slug)
  if (!url || def.public === false) {
    return null
  }
  const name = def.labels.name
  return {
    type: slug,
    title: `${name} archive`,
    url,
  }
}

export function pathMapForRows(rows: Collection[]): Map<number, string> {
  return buildSlugPathMap(rows.map(row => ({
    id: row.id,
    slug: row.slug,
    parent_id: row.parent_id,
  })))
}
