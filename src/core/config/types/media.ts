/**
 * User-facing media configuration.
 *
 * Storage directory and public URL prefix are filled in by the framework adapter.
 * Core only knows upload limits, MIME types, and image-variant presets.
 */
export interface MediaConfig {
  /** Maximum upload size in megabytes. Defaults to 10. */
  maxFileSize?: number
  /**
   * Allowed MIME types. An empty array allows any type.
   */
  allowedMimeTypes?: string[]
  /**
   * Generate an AVIF copy of every uploaded raster image (and of each registered
   * `imageSizes` entry). `true` uses the default quality (80); pass an object to
   * override it. Disabled by default.
   */
  avif?: boolean | ImageFormatOptions
  /**
   * Generate a WebP copy of every uploaded raster image (and of each registered
   * `imageSizes` entry). `true` uses the default quality (80); pass an object to
   * override it. Disabled by default.
   */
  webp?: boolean | ImageFormatOptions
  /**
   * Named resize presets generated for every uploaded raster image.
   * For each entry a resized copy is produced in the original format plus any
   * enabled `avif` / `webp` formats. Empty by default.
   */
  imageSizes?: ImageSize[]
}

/** Per-format encoder options. */
export interface ImageFormatOptions {
  /** Encoder quality (1–100). Defaults to 80. */
  quality?: number
}

/**
 * A named resize preset.
 *
 * A `0` (or omitted) dimension means "scale proportionally to the other side".
 * Images are never enlarged beyond their intrinsic size.
 */
export interface ImageSize {
  /** Unique label, e.g. `medium`, `large`. Used in the variant metadata. */
  name: string
  /** Target width in px. `0` = proportional to `height`. */
  width?: number
  /** Target height in px. `0` = proportional to `width`. */
  height?: number
  /**
   * When `true`, the image is cropped to exactly cover `width`×`height`
   * (`fit: cover`). When `false` (default), it is scaled to fit inside the box
   * without cropping (`fit: inside`).
   */
  crop?: boolean
}

/** A generated image format, fully resolved with its quality. */
export interface ResolvedImageFormat {
  quality: number
}

/** A fully-resolved resize preset (no optional fields). */
export interface ResolvedImageSize {
  name: string
  width: number
  height: number
  crop: boolean
}

/**
 * Media config after defaults and format/size normalisation.
 * `dir` is optional: the Nuxt/Next adapter sets the absolute upload directory.
 */
export interface ResolvedMediaConfig {
  dir?: string
  maxFileSize: number
  allowedMimeTypes: string[]
  avif: ResolvedImageFormat | false
  webp: ResolvedImageFormat | false
  imageSizes: ResolvedImageSize[]
}
