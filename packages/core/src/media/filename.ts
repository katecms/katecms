import type { Buffer } from 'node:buffer'
import { transliterate } from '../text'
import type { ImageDimensions } from './types'

/**
 * Build the storage key for a generated variant from the original key.
 *
 * The full-size re-encode keeps the original base name (`photo.jpg` →
 * `photo.webp`); sized variants append the rendered dimensions
 * (`photo.jpg` → `photo-480x480.webp`).
 */
export function variantFilename(
  originalKey: string,
  width: number,
  height: number,
  ext: string,
  full: boolean,
): string {
  const dot = originalKey.lastIndexOf('.')
  const base = dot > 0 ? originalKey.slice(0, dot) : originalKey
  return full ? `${base}.${ext}` : `${base}-${width}x${height}.${ext}`
}

/** Canonical extension per MIME type, used when an upload has no usable name. */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
}

/**
 * Strip directories, transliterate Cyrillic and replace unsafe characters in a
 * user-supplied file name so the resulting storage key is readable ASCII.
 */
export function sanitizeFilename(name: string): string {
  const base = transliterate(name.replace(/^.*[\\/]/, '').trim())
  return base.replace(/[^\w.-]+/g, '_').slice(0, 200) || 'file'
}

function extFromName(name: string | undefined): string {
  if (!name) {
    return ''
  }
  const match = /\.([a-z0-9]+)$/i.exec(name)
  return match ? (match[1] ?? '').toLowerCase() : ''
}

/** Pick a file extension from the original name, falling back to the MIME type. */
export function resolveExtension(originalName: string | undefined, mimeType: string): string {
  return extFromName(originalName) || MIME_TO_EXT[mimeType] || 'bin'
}

/**
 * Resolve a storage key that keeps the original (sanitized) file name. If a file
 * with that name already exists, a numeric suffix is appended before the
 * extension (`name.jpg` → `name-1.jpg` → `name-2.jpg`, …) so existing uploads
 * are never overwritten.
 */
export async function uniqueFilename(
  name: string,
  exists: (key: string) => Promise<boolean>,
): Promise<string> {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''

  let candidate = name
  let index = 1
  while (await exists(candidate)) {
    candidate = `${base}-${index}${ext}`
    index++
  }
  return candidate
}

/** Canonical extension for a MIME type. Unknown types become `bin`. */
export function extensionForMime(mimeType: string): string {
  const mime = mimeType.toLowerCase().split(';')[0]?.trim() || ''
  return MIME_TO_EXT[mime] || 'bin'
}

/**
 * Whether `data` has the signature of `mimeType`.
 * The client-supplied Content-Type is not trusted on its own.
 */
export function contentMatchesMime(data: Buffer, mimeType: string): boolean {
  const mime = mimeType.toLowerCase().split(';')[0]?.trim() || ''
  if (mime === 'image/jpeg') {
    return data.length >= 3 && data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF
  }
  if (mime === 'image/png') {
    return data.length >= 8
      && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47
  }
  if (mime === 'image/gif') {
    return data.length >= 6 && data.subarray(0, 4).toString('ascii') === 'GIF8'
  }
  if (mime === 'image/webp') {
    return data.length >= 12
      && data.subarray(0, 4).toString('ascii') === 'RIFF'
      && data.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  if (mime === 'application/pdf') {
    return data.length >= 5 && data.subarray(0, 5).toString('ascii') === '%PDF-'
  }
  if (mime === 'video/mp4' || mime === 'image/avif') {
    const brand = ftypBrand(data)
    if (!brand) {
      return false
    }
    const avif = brand === 'avif' || brand === 'avis' || brand === 'mif1'
    return mime === 'image/avif' ? avif : !avif
  }
  if (mime === 'audio/mpeg') {
    return data.length >= 3 && (
      data.subarray(0, 3).toString('ascii') === 'ID3'
      || (data[0] === 0xFF && (data[1]! & 0xE0) === 0xE0)
    )
  }
  if (mime === 'image/svg+xml') {
    return looksLikeSvg(data)
  }
  return false
}

function ftypBrand(data: Buffer): string | null {
  if (data.length < 12 || data.subarray(4, 8).toString('ascii') !== 'ftyp') {
    return null
  }
  return data.subarray(8, 12).toString('ascii').toLowerCase()
}

function looksLikeSvg(data: Buffer): boolean {
  const head = data.subarray(0, Math.min(data.length, 512)).toString('utf8').replace(/^\uFEFF/, '').trimStart().toLowerCase()
  if (!head || head.includes('\0')) {
    return false
  }
  return head.startsWith('<svg')
    || head.startsWith('<!doctype svg')
    || (head.startsWith('<?xml') && head.includes('<svg'))
}

/**
 * Build a collision-free storage key from an upload's original name and MIME type.
 * The extension always comes from the MIME type, not from the original file name.
 */
export async function prepareUploadKey(
  originalName: string | undefined,
  mimeType: string,
  exists: (key: string) => Promise<boolean>,
): Promise<string> {
  const ext = extensionForMime(mimeType)
  let stem = 'file'
  if (originalName) {
    const cleaned = sanitizeFilename(originalName).replace(/\.[^.]+$/, '').replace(/^\.+/, '')
    stem = cleaned || 'file'
  }
  return uniqueFilename(`${stem}.${ext}`, exists)
}

/** Append or bump a numeric suffix before the extension (`a.jpg` → `a-1.jpg` → `a-2.jpg`). */
export function incrementFilename(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  const match = /^(.*)-(\d+)$/.exec(base)
  if (match) {
    return `${match[1]}-${Number(match[2]) + 1}${ext}`
  }
  return `${base}-1${ext}`
}

/**
 * Read intrinsic pixel dimensions from the file header for PNG, GIF, JPEG, WebP.
 * Returns null for vector/unknown formats or malformed data.
 */
export function readImageSize(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) {
    return null
  }

  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
  }

  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return readJpegSize(buffer)
  }

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return readWebpSize(buffer)
  }

  return null
}

function readJpegSize(buffer: Buffer): ImageDimensions | null {
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer.readUInt8(offset) !== 0xFF) {
      offset++
      continue
    }
    const marker = buffer.readUInt8(offset + 1)
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      const height = buffer.readUInt16BE(offset + 5)
      const width = buffer.readUInt16BE(offset + 7)
      return { width, height }
    }
    const segmentLength = buffer.readUInt16BE(offset + 2)
    if (segmentLength < 2) {
      return null
    }
    offset += 2 + segmentLength
  }
  return null
}

function readWebpSize(buffer: Buffer): ImageDimensions | null {
  const format = buffer.toString('ascii', 12, 16)
  if (format === 'VP8 ') {
    const width = buffer.readUInt16LE(26) & 0x3FFF
    const height = buffer.readUInt16LE(28) & 0x3FFF
    return { width, height }
  }
  if (format === 'VP8L') {
    const bits = buffer.readUInt32LE(21)
    const width = (bits & 0x3FFF) + 1
    const height = ((bits >> 14) & 0x3FFF) + 1
    return { width, height }
  }
  if (format === 'VP8X') {
    const width = (buffer.readUInt8(24) | (buffer.readUInt8(25) << 8) | (buffer.readUInt8(26) << 16)) + 1
    const height = (buffer.readUInt8(27) | (buffer.readUInt8(28) << 8) | (buffer.readUInt8(29) << 16)) + 1
    return { width, height }
  }
  return null
}
