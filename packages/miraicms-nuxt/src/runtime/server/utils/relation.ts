import {
  buildArchivePath,
  buildPublicPath,
  buildSlugPathMap,
  isImageMedia,
  isMediaItem,
} from '@miraicms/core'
import type { Collection, CollectionDefinition, MediaItem, RelationEntryValue } from '@miraicms/core'

const FEATURED_FIELD_KEYS = ['thumbnail', 'featured_image', 'image'] as const
export const RELATION_PICKER_LIMIT = 500

export function readStringList(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []
  return [...new Set(parts.map(item => String(item).trim()).filter(Boolean))]
}

export function pickFeaturedImage(fields: unknown): MediaItem | null {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return null
  }
  const record = fields as Record<string, unknown>
  for (const key of FEATURED_FIELD_KEYS) {
    const value = record[key]
    if (isMediaItem(value) && isImageMedia(value)) {
      return value
    }
    if (Array.isArray(value) && isMediaItem(value[0]) && isImageMedia(value[0])) {
      return value[0]
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
): RelationEntryValue & { termIds?: number[] } {
  const path = slugPath || row.slug
  const entry: RelationEntryValue & { termIds?: number[] } = {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    slugPath: path,
    url: buildPublicPath(def.rewrite, row.type, path),
  }
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
): { url: string, title: string, type: string } {
  const name = def.labels.name
  return {
    type: slug,
    title: `${name} archive`,
    url: buildArchivePath(def.rewrite, slug),
  }
}

export function pathMapForRows(rows: Collection[]): Map<number, string> {
  return buildSlugPathMap(rows.map(row => ({
    id: row.id,
    slug: row.slug,
    parent_id: row.parent_id,
  })))
}
