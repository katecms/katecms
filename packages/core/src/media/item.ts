import type { Media } from '../database/queries/media'
import type { MediaItem, MediaVariant, MediaVariantsStatus, StoredMediaVariant } from './types'

/** Drain a leftover Kysely `ColumnType` so mapper input is plain JS values. */
type SelectType<T> = T extends { readonly __select__: infer S } ? S : T
type MediaRow = { [K in keyof Media]: SelectType<Media[K]> }

function isStoredVariant(value: unknown): value is StoredMediaVariant {
  if (!value || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    typeof row.size === 'string'
    && typeof row.format === 'string'
    && typeof row.filename === 'string'
    && typeof row.width === 'number'
    && typeof row.height === 'number'
    && typeof row.filesize === 'number'
  )
}

export interface ToMediaItemOptions {
  /** Build a public URL from a storage key. */
  publicUrl: (key: string) => string
  /** Display name (or email) of the uploader, resolved by the caller. */
  uploadedByName?: string | null
}

/**
 * Map a `media` row to the client DTO. `url` / variant URLs are derived so they
 * stay in sync if the public prefix changes.
 */
export function toMediaItem(row: MediaRow, options: ToMediaItemOptions): MediaItem {
  const raw = Array.isArray(row.variants) ? row.variants : []
  const variants: MediaVariant[] = raw.filter(isStoredVariant).map(variant => ({
    ...variant,
    url: options.publicUrl(variant.filename),
  }))

  return {
    id: row.id,
    filename: row.filename,
    mime_type: row.mime_type,
    filesize: Number(row.filesize),
    width: row.width,
    height: row.height,
    url: options.publicUrl(row.filename),
    alt: row.alt,
    caption: row.caption,
    uploaded_by: row.uploaded_by,
    uploaded_by_name: options.uploadedByName ?? null,
    variants_status: row.variants_status as MediaVariantsStatus,
    variants,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }
}
