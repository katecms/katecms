import type { ImageFormatOptions, ImageSize, MediaConfig, ResolvedImageFormat, ResolvedImageSize, ResolvedMediaConfig } from './types'
import { defaults } from './defaults'

/** Default encoder quality used when a format is enabled with `true`. */
export const DEFAULT_IMAGE_QUALITY = 80

/** Default sharp decoded-pixel ceiling (~7071×7071). */
export const DEFAULT_MAX_INPUT_PIXELS = 50_000_000

/**
 * Reserved `imageSizes` name for the full-resolution copy.
 * Adapters must not allow this as a user preset name.
 */
export const RESERVED_SIZE_NAME = 'full'

export interface ResolveMediaResult {
  media: ResolvedMediaConfig
  warnings: string[]
}

function clampQuality(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_IMAGE_QUALITY
  }
  return Math.min(100, Math.max(1, Math.round(value)))
}

function resolveImageFormat(value: boolean | ImageFormatOptions | undefined): ResolvedImageFormat | false {
  if (!value) {
    return false
  }
  const quality = typeof value === 'object' && typeof value.quality === 'number'
    ? clampQuality(value.quality)
    : DEFAULT_IMAGE_QUALITY
  return { quality }
}

function resolveImageSizes(sizes: ImageSize[] | undefined): { sizes: ResolvedImageSize[], warnings: string[] } {
  const warnings: string[] = []
  const seen = new Set<string>()
  const resolved: ResolvedImageSize[] = []
  for (const size of sizes ?? []) {
    if (typeof size?.name !== 'string' || size.name.length === 0) {
      continue
    }
    if (size.name === RESERVED_SIZE_NAME) {
      warnings.push(`imageSizes name "${RESERVED_SIZE_NAME}" is reserved and was ignored.`)
      continue
    }
    if (seen.has(size.name)) {
      warnings.push(`imageSizes name "${size.name}" is duplicated and was ignored.`)
      continue
    }
    seen.add(size.name)
    resolved.push({
      name: size.name,
      width: size.width ?? 0,
      height: size.height ?? 0,
      crop: size.crop ?? false,
    })
  }
  return { sizes: resolved, warnings }
}

/** Whether `mimeType` is in the allow-list. An empty list allows nothing. */
export function isMimeAllowed(mimeType: string, allowed: string[]): boolean {
  return allowed.length > 0 && allowed.includes(mimeType)
}

/** Apply media defaults and normalise avif/webp/imageSizes. Does not set `dir`. */
export function resolveMediaConfig(config?: MediaConfig): ResolveMediaResult {
  const media = config ?? {}
  const { sizes, warnings } = resolveImageSizes(media.imageSizes)
  const defaultMaxFileSize = defaults.media.maxFileSize
  let maxFileSize = media.maxFileSize ?? defaultMaxFileSize
  if (!Number.isFinite(maxFileSize) || maxFileSize <= 0) {
    warnings.push(`maxFileSize must be greater than 0; using ${defaultMaxFileSize}.`)
    maxFileSize = defaultMaxFileSize
  }
  const maxInputPixels = media.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS
  return {
    media: {
      maxFileSize,
      allowedMimeTypes: media.allowedMimeTypes ?? defaults.media.allowedMimeTypes,
      maxInputPixels: Number.isFinite(maxInputPixels) && maxInputPixels > 0
        ? maxInputPixels
        : DEFAULT_MAX_INPUT_PIXELS,
      avif: resolveImageFormat(media.avif),
      webp: resolveImageFormat(media.webp),
      imageSizes: sizes,
    },
    warnings,
  }
}
