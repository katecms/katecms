import type { MediaVariantsStatus } from '../database/client/schema'

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

export interface ImageDimensions {
  width: number
  height: number
}
