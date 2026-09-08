/**
 * Browser-safe media DTOs.
 *
 * Runtime media (storage, sharp, toMediaItem) stays on the Node entry.
 * This file must not import `database`, `fs`, or other Node-only modules so
 * it can be re-exported from `src/browser.ts`.
 */

/** State of asynchronous variant generation for a media item. */
export type MediaVariantsStatus = 'none' | 'pending' | 'ready' | 'failed'

/**
 * A generated derivative stored beside the original.
 * The public URL is not stored — it is derived from `filename` at read time.
 */
export interface StoredMediaVariant {
  /** Registered `imageSizes` name, or `'full'` for the un-resized extra format. */
  size: string
  /** Output MIME subtype, e.g. `jpeg`, `png`, `webp`, `avif`. */
  format: string
  /** Storage key under the uploads directory. */
  filename: string
  width: number
  height: number
  filesize: number
}

/** A variant as exposed to clients: stored shape plus a derived URL. */
export interface MediaVariant extends StoredMediaVariant {
  url: string
}

/** A media library entry with URLs derived from storage keys. */
export interface MediaItem {
  id: number
  filename: string
  mime_type: string
  filesize: number
  width: number | null
  height: number | null
  url: string
  alt: string | null
  caption: string | null
  uploaded_by: number | null
  uploaded_by_name: string | null
  variants_status: MediaVariantsStatus
  variants: MediaVariant[]
  created_at: string
}

/** Single image/file field value (`returnFormat` array / url / id). */
export type MediaFieldValue = MediaItem | string | number

/** Gallery field value (`returnFormat` array / url / id). */
export type GalleryFieldValue = MediaItem[] | string[] | number[]

export function isMediaItem(value: unknown): value is MediaItem {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && typeof (value as { url?: unknown }).url === 'string'
}

export function isImageMedia(item?: Pick<MediaItem, 'mime_type'> | null): boolean {
  return item?.mime_type?.startsWith('image/') ?? false
}

export interface ImageDimensions {
  width: number
  height: number
}
