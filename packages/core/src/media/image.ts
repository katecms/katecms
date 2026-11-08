import sharp from 'sharp'
import type { Buffer } from 'node:buffer'
import { RESERVED_SIZE_NAME } from '../config'
import type { ResolvedImageSize, ResolvedMediaConfig } from '../config'
import type { MediaStorage } from './storage'
import type { StoredMediaVariant } from './types'
import { readImageSize, variantFilename } from './filename'

/** Reserved `MediaVariant.size` label for the full-resolution extra-format copy. */
export const FULL_SIZE = RESERVED_SIZE_NAME

type EncodeFormat = 'original' | 'webp' | 'avif'

interface FormatJob {
  encode: EncodeFormat
  subtype: string
  ext: string
  quality?: number
}

/** MIME types sharp will re-encode / resize. SVG, PDF and animated GIF stay as-is. */
const PROCESSABLE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function isProcessableImage(mimeType: string): boolean {
  return PROCESSABLE_MIME_TYPES.has(mimeType)
}

export function hasVariantFormats(config: ResolvedMediaConfig): boolean {
  return Boolean(config.avif || config.webp)
}

/** True when extra formats or named sizes mean variants should be generated. */
export function hasImageWork(config: ResolvedMediaConfig): boolean {
  return hasVariantFormats(config) || config.imageSizes.length > 0
}

function extraFormats(config: ResolvedMediaConfig): FormatJob[] {
  const formats: FormatJob[] = []
  if (config.avif) {
    formats.push({ encode: 'avif', subtype: 'avif', ext: 'avif', quality: config.avif.quality })
  }
  if (config.webp) {
    formats.push({ encode: 'webp', subtype: 'webp', ext: 'webp', quality: config.webp.quality })
  }
  return formats
}

function originalFormat(mimeType: string, key: string): FormatJob {
  const subtype = mimeType.split('/')[1] || 'jpeg'
  const dot = key.lastIndexOf('.')
  const ext = dot > 0 ? key.slice(dot + 1).toLowerCase() : subtype
  return { encode: 'original', subtype, ext }
}

interface RenderResult {
  data: Buffer
  width: number
  height: number
}

/** Sharp's own `limitInputPixels` default: 16383×16383. Larger headers are refused before decode. */
const SHARP_MAX_INPUT_PIXELS = 16_383 * 16_383

/** Bands sharp accepts on a raw input (`Channels`). */
type RawChannels = 1 | 2 | 3 | 4

function rawChannels(channels: number): RawChannels {
  if (channels === 1 || channels === 2 || channels === 3 || channels === 4) {
    return channels
  }
  throw new Error(`Raw pixel data has ${channels} channels; sharp accepts 1–4.`)
}

interface PixelSource {
  data: Buffer
  /** Set when `data` is raw pixels already scaled to the budget. */
  raw?: { width: number, height: number, channels: RawChannels }
}

function fitWithinPixelLimit(
  width: number,
  height: number,
  maxPixels: number,
): { width: number, height: number } {
  const scale = Math.sqrt(maxPixels / (width * height))
  let nextWidth = Math.max(1, Math.floor(width * scale))
  let nextHeight = Math.max(1, Math.floor(height * scale))
  while (nextWidth * nextHeight > maxPixels && (nextWidth > 1 || nextHeight > 1)) {
    if (nextWidth >= nextHeight && nextWidth > 1) {
      nextWidth -= 1
    }
    else {
      nextHeight -= 1
    }
  }
  return { width: nextWidth, height: nextHeight }
}

/**
 * Keep variant generation inside `maxInputPixels`. Sources under the budget
 * are returned unchanged. Larger sources are decoded once and scaled down.
 * A header above sharp's ceiling is rejected before any bitmap is allocated.
 */
async function sourceWithinPixelLimit(data: Buffer, maxInputPixels: number): Promise<PixelSource> {
  const dims = readImageSize(data)
  if (!dims || dims.width <= 0 || dims.height <= 0) {
    return { data }
  }
  const pixels = dims.width * dims.height
  if (!Number.isFinite(pixels) || pixels <= maxInputPixels) {
    return { data }
  }
  if (pixels > SHARP_MAX_INPUT_PIXELS) {
    throw new Error(
      `Image is ${dims.width}×${dims.height} px, above the ${SHARP_MAX_INPUT_PIXELS} pixel safety limit.`,
    )
  }
  const fitted = fitWithinPixelLimit(dims.width, dims.height, maxInputPixels)
  const { data: raw, info } = await sharp(data, {
    failOn: 'none',
    limitInputPixels: pixels,
  })
    .resize({
      width: fitted.width,
      height: fitted.height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return {
    data: raw,
    raw: { width: info.width, height: info.height, channels: rawChannels(info.channels) },
  }
}

async function render(
  source: PixelSource,
  size: ResolvedImageSize | null,
  job: FormatJob,
  maxInputPixels: number,
): Promise<RenderResult> {
  let pipeline = source.raw
    ? sharp(source.data, { raw: source.raw, failOn: 'none', limitInputPixels: false })
    : sharp(source.data, { failOn: 'none', limitInputPixels: maxInputPixels })

  if (size) {
    pipeline = pipeline.resize({
      width: size.width || undefined,
      height: size.height || undefined,
      fit: size.crop ? 'cover' : 'inside',
      withoutEnlargement: true,
    })
  }

  if (job.encode === 'avif') {
    pipeline = pipeline.avif({ quality: job.quality })
  }
  else if (job.encode === 'webp') {
    pipeline = pipeline.webp({ quality: job.quality })
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

export interface GenerateVariantsOptions {
  storage: MediaStorage
  /** Storage key of the original upload (e.g. `photo.jpg`). */
  key: string
  /** MIME type of the original upload (e.g. `image/jpeg`). */
  mimeType: string
  /** Raw bytes of the original upload. */
  data: Buffer
  config: ResolvedMediaConfig
}

/**
 * Produce the `sizes × formats` matrix for an uploaded image and write each
 * file to storage. Returns metadata to persist on the media row. On failure,
 * every file written in this call is deleted before the error propagates.
 */
export async function generateVariants(options: GenerateVariantsOptions): Promise<StoredMediaVariant[]> {
  const { storage, key, mimeType, data, config } = options

  const extras = extraFormats(config)
  const sizes = config.imageSizes
  if (!extras.length && !sizes.length) {
    return []
  }

  const tasks: Array<{ size: ResolvedImageSize | null, job: FormatJob }> = []
  for (const job of extras) {
    tasks.push({ size: null, job })
  }
  const original = originalFormat(mimeType, key)
  for (const size of sizes) {
    tasks.push({ size, job: original })
    for (const job of extras) {
      if (job.subtype !== original.subtype) {
        tasks.push({ size, job })
      }
    }
  }

  const variants: StoredMediaVariant[] = []
  const written: string[] = []

  try {
    const source = await sourceWithinPixelLimit(data, config.maxInputPixels)
    for (const { size, job } of tasks) {
      const out = await render(source, size, job, config.maxInputPixels)
      const variantKey = variantFilename(key, out.width, out.height, job.ext, size === null)

      if (variantKey === key) {
        continue
      }

      await storage.put(variantKey, out.data)
      written.push(variantKey)
      variants.push({
        size: size?.name ?? FULL_SIZE,
        format: job.subtype,
        filename: variantKey,
        width: out.width,
        height: out.height,
        filesize: out.data.length,
      })
    }
  }
  catch (error) {
    await Promise.all(written.map(k => storage.delete(k).catch(() => {})))
    throw error
  }

  return variants
}

export interface RegenerateVariantsOptions {
  storage: MediaStorage
  key: string
  mimeType: string
  oldVariants: StoredMediaVariant[]
  config: ResolvedMediaConfig
}

/**
 * Re-create variants from the original in storage, then delete previous
 * variant files that the new config no longer produces. New files are written
 * first so a failure leaves existing variants intact.
 */
export async function regenerateVariants(options: RegenerateVariantsOptions): Promise<StoredMediaVariant[]> {
  const { storage, key, mimeType, oldVariants, config } = options

  const data = await storage.get(key)
  const variants = await generateVariants({ storage, key, mimeType, data, config })

  const freshKeys = new Set(variants.map(variant => variant.filename))
  await Promise.all(
    oldVariants
      .filter(variant => !freshKeys.has(variant.filename))
      .map(variant => storage.delete(variant.filename).catch(() => {})),
  )

  return variants
}
