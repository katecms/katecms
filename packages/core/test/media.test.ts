import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'
import type { MediaStorage } from '../src'
import {
  buildPublicUrl,
  createLocalMediaStorage,
  generateVariants,
  isImageMedia,
  isMediaItem,
  contentMatchesMime,
  isProcessableImage,
  prepareUploadKey,
  readImageSize,
  resolveMediaConfig,
  sanitizeFilename,
  toMediaItem,
  uniqueFilename,
  incrementFilename,
  variantFilename,
} from '../src'

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
})

function memoryStorage(): MediaStorage & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>()
  return {
    files,
    async put(key, data) {
      files.set(key, Buffer.from(data))
    },
    async get(key) {
      const data = files.get(key)
      if (!data) {
        throw new Error(`missing ${key}`)
      }
      return data
    },
    async delete(key) {
      files.delete(key)
    },
    async exists(key) {
      return files.has(key)
    },
    publicUrl(key) {
      return buildPublicUrl(key, '/uploads')
    },
  }
}

describe('media value guards', () => {
  it('detects media items and image MIME types', () => {
    expect(isMediaItem({ url: '/uploads/a.jpg' })).toBe(true)
    expect(isMediaItem({ url: 1 })).toBe(false)
    expect(isMediaItem(['/uploads/a.jpg'])).toBe(false)
    expect(isMediaItem(null)).toBe(false)
    expect(isImageMedia({ mime_type: 'image/png' })).toBe(true)
    expect(isImageMedia({ mime_type: 'application/pdf' })).toBe(false)
    expect(isImageMedia({ mime_type: '' })).toBe(false)
    expect(isImageMedia(null)).toBe(false)
  })
})

describe('sanitizeFilename / uniqueFilename', () => {
  it('transliterates Cyrillic and strips directories', () => {
    expect(sanitizeFilename('C:\\tmp\\фото.jpg')).toBe('foto.jpg')
    expect(sanitizeFilename('my photo (1).png')).toBe('my_photo_1_.png')
  })

  it('appends a numeric suffix when the key already exists', async () => {
    const exists = async (key: string) => key === 'photo.jpg' || key === 'photo-1.jpg'
    expect(await uniqueFilename('photo.jpg', exists)).toBe('photo-2.jpg')
  })

  it('falls back to file.<ext> when the original name is missing', async () => {
    expect(await prepareUploadKey(undefined, 'image/png', async () => false)).toBe('file.png')
  })

  it('takes the extension from the MIME type, not the uploaded name', async () => {
    expect(await prepareUploadKey('evil.svg', 'image/jpeg', async () => false)).toBe('evil.jpg')
    expect(await prepareUploadKey('notes.html', 'image/png', async () => false)).toBe('notes.png')
  })

  it('accepts a signature only when it matches the declared type', () => {
    const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xD9])
    const svg = Buffer.from('<svg/onload=alert(1)></svg>')
    expect(contentMatchesMime(jpeg, 'image/jpeg')).toBe(true)
    expect(contentMatchesMime(svg, 'image/jpeg')).toBe(false)
    expect(contentMatchesMime(svg, 'image/svg+xml')).toBe(true)
    expect(contentMatchesMime(jpeg, 'image/svg+xml')).toBe(false)
  })

  it('bumps a numeric suffix before the extension', () => {
    expect(incrementFilename('photo.jpg')).toBe('photo-1.jpg')
    expect(incrementFilename('photo-1.jpg')).toBe('photo-2.jpg')
  })
})

describe('variantFilename / readImageSize', () => {
  it('keeps the base name for a full-size re-encode', () => {
    expect(variantFilename('photo.jpg', 800, 600, 'webp', true)).toBe('photo.webp')
    expect(variantFilename('photo.jpg', 480, 480, 'webp', false)).toBe('photo-480x480.webp')
  })

  it('reads PNG dimensions from the IHDR chunk', () => {
    const png = Buffer.alloc(24)
    png[0] = 0x89
    png[1] = 0x50
    png[2] = 0x4E
    png[3] = 0x47
    png.writeUInt32BE(12, 16)
    png.writeUInt32BE(8, 20)
    expect(readImageSize(png)).toEqual({ width: 12, height: 8 })
  })
})

describe('createLocalMediaStorage', () => {
  it('writes, reads, and deletes files under dir', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'miraicms-media-'))
    tempDirs.push(dir)
    const storage = createLocalMediaStorage({ dir, publicPrefix: '/uploads' })

    await storage.put('hello.txt', Buffer.from('hi'))
    expect(await storage.exists('hello.txt')).toBe(true)
    expect((await storage.get('hello.txt')).toString()).toBe('hi')
    expect(storage.publicUrl('hello.txt')).toBe('/uploads/hello.txt')

    await storage.delete('hello.txt')
    expect(await storage.exists('hello.txt')).toBe(false)
  })

  it('refuses path traversal', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'miraicms-media-'))
    tempDirs.push(dir)
    const storage = createLocalMediaStorage({ dir, publicPrefix: '/uploads' })
    await expect(storage.put('../escape.txt', Buffer.from('x'))).rejects.toThrow(/outside/)
  })
})

describe('generateVariants', () => {
  it('writes webp full-size and cropped size variants', async () => {
    expect(isProcessableImage('image/png')).toBe(true)
    expect(isProcessableImage('image/svg+xml')).toBe(false)

    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 20, g: 40, b: 60 } },
    }).png().toBuffer()

    const { media } = resolveMediaConfig({
      webp: { quality: 80 },
      imageSizes: [{ name: 'thumb', width: 16, height: 16, crop: true }],
    })
    const storage = memoryStorage()
    const variants = await generateVariants({
      storage,
      key: 'hero.png',
      mimeType: 'image/png',
      data: png,
      config: media,
    })

    const keys = variants.map(variant => variant.filename).sort()
    expect(keys).toEqual(['hero-16x16.png', 'hero-16x16.webp', 'hero.webp'])
    expect(variants.find(variant => variant.size === 'full')?.format).toBe('webp')
    expect(storage.files.has('hero.png')).toBe(false)
  })

  it('scales a source above maxInputPixels and rejects a pixel bomb', async () => {
    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 20, g: 40, b: 60 } },
    }).png().toBuffer()

    const { media } = resolveMediaConfig({
      webp: true,
      maxInputPixels: 1000,
    })
    const storage = memoryStorage()
    const variants = await generateVariants({
      storage,
      key: 'wide.png',
      mimeType: 'image/png',
      data: png,
      config: media,
    })

    const full = variants.find(variant => variant.size === 'full')
    expect(full).toBeTruthy()
    expect((full?.width ?? 0) * (full?.height ?? 0)).toBeLessThanOrEqual(1000)
    expect(full?.width).toBeLessThan(64)

    const bomb = Buffer.alloc(24)
    bomb[0] = 0x89
    bomb[1] = 0x50
    bomb[2] = 0x4E
    bomb[3] = 0x47
    bomb.writeUInt32BE(20_000, 16)
    bomb.writeUInt32BE(20_000, 20)
    await expect(generateVariants({
      storage,
      key: 'bomb.png',
      mimeType: 'image/png',
      data: bomb,
      config: media,
    })).rejects.toThrow(/safety limit/)
    expect(storage.files.has('bomb.webp')).toBe(false)
  })
})

describe('toMediaItem', () => {
  it('derives urls from the publicUrl callback', () => {
    const row = {
      id: 1,
      filename: 'hero.png',
      mime_type: 'image/png',
      filesize: 12,
      width: 32,
      height: 32,
      alt: null,
      caption: null,
      uploaded_by: 9,
      variants: [{
        size: 'thumb',
        format: 'webp',
        filename: 'hero-16x16.webp',
        width: 16,
        height: 16,
        filesize: 4,
      }],
      variants_status: 'ready' as const,
      created_at: new Date('2026-01-02T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
    }

    const item = toMediaItem(row, {
      publicUrl: key => `/uploads/${key}`,
      uploadedByName: 'Ada',
    })
    expect(item.url).toBe('/uploads/hero.png')
    expect(item.uploaded_by_name).toBe('Ada')
    expect(item.variants[0]?.url).toBe('/uploads/hero-16x16.webp')
  })
})
