import type { ImageFormatOptions, ImageSize, MediaConfig, ResolvedImageFormat, ResolvedImageSize, ResolvedMediaConfig } from './types'
import { defaults } from './defaults'

/** Default encoder quality used when a format is enabled with `true`. */
export const DEFAULT_IMAGE_QUALITY = 80

/**
 * Reserved `imageSizes` name for the full-resolution copy.
 * Adapters must not allow this as a user preset name.
 */
export const RESERVED_SIZE_NAME = 'full'

export interface ResolveMediaResult {
  media: ResolvedMediaConfig
  warnings: string[]
}

function resolveImageFormat(value: boolean | ImageFormatOptions | undefined): ResolvedImageFormat | false {
  if (!value) {
    return false
  }
  const quality = typeof value === 'object' && typeof value.quality === 'number'
    ? value.quality
    : DEFAULT_IMAGE_QUALITY
  return { quality }
}

function resolveImageSizes(sizes: ImageSize[] | undefined): { sizes: ResolvedImageSize[], warnings: string[] } {
  const warnings: string[] = []
  const resolved = (sizes ?? [])
    .filter(size => typeof size?.name === 'string' && size.name.length > 0)
    .filter((size) => {
      if (size.name === RESERVED_SIZE_NAME) {
        warnings.push(`imageSizes name "${RESERVED_SIZE_NAME}" is reserved and was ignored.`)
        return false
      }
      return true
    })
    .map(size => ({
      name: size.name,
      width: size.width ?? 0,
      height: size.height ?? 0,
      crop: size.crop ?? false,
    }))
  return { sizes: resolved, warnings }
}

/** Apply media defaults and normalise avif/webp/imageSizes. Does not set `dir`. */
export function resolveMediaConfig(config?: MediaConfig): ResolveMediaResult {
  const media = config ?? {}
  const { sizes, warnings } = resolveImageSizes(media.imageSizes)
  return {
    media: {
      maxFileSize: media.maxFileSize ?? defaults.media!.maxFileSize!,
      allowedMimeTypes: media.allowedMimeTypes ?? defaults.media!.allowedMimeTypes!,
      avif: resolveImageFormat(media.avif),
      webp: resolveImageFormat(media.webp),
      imageSizes: sizes,
    },
    warnings,
  }
}
