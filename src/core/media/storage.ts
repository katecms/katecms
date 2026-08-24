import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import type { Buffer } from 'node:buffer'

export interface MediaStorage {
  /** Persist binary data under `key` (e.g. `my-photo.png`). */
  put(key: string, data: Buffer | Uint8Array): Promise<void>
  /** Read the raw bytes stored at `key`. Rejects if the object is missing. */
  get(key: string): Promise<Buffer>
  /** Remove the object at `key`. Does not throw if it is already gone. */
  delete(key: string): Promise<void>
  /** Whether an object already exists at `key`. */
  exists(key: string): Promise<boolean>
  /** Public, browser-reachable URL for the object at `key`. */
  publicUrl(key: string): string
}

/**
 * Encode a storage key as a URL path under `publicPrefix`.
 * The prefix is required: adapters choose `/uploads`, `/media`, a CDN origin, etc.
 */
export function buildPublicUrl(key: string, publicPrefix: string): string {
  const prefix = publicPrefix.replace(/\/+$/, '') || ''
  const encoded = key.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return `${prefix}/${encoded}`
}

export interface CreateLocalMediaStorageOptions {
  /** Absolute directory where files are written. */
  dir: string
  /** Public URL prefix, e.g. `/uploads`. Required — core does not pick a default. */
  publicPrefix: string
}

function isUnsafeKey(key: string): boolean {
  const normalized = key.replace(/\\/g, '/')
  if (!normalized || normalized.includes('\0')) {
    return true
  }
  if (normalized.startsWith('/') || /^[a-z]:/i.test(normalized)) {
    return true
  }
  return normalized.split('/').some(segment => segment === '..' || segment === '')
}

/**
 * Local filesystem storage. Keys are confined to `dir`; path traversal is refused.
 */
export function createLocalMediaStorage(options: CreateLocalMediaStorageOptions): MediaStorage {
  const baseDir = resolve(options.dir)
  const publicPrefix = options.publicPrefix

  function resolvePath(key: string): string {
    if (isUnsafeKey(key)) {
      throw new Error(`Refusing to access path outside the storage directory: ${key}`)
    }
    const full = resolve(baseDir, key)
    if (full !== baseDir && !full.startsWith(baseDir + sep)) {
      throw new Error(`Refusing to access path outside the storage directory: ${key}`)
    }
    return full
  }

  return {
    async put(key, data) {
      const path = resolvePath(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, data)
    },

    async get(key) {
      return readFile(resolvePath(key))
    },

    async delete(key) {
      await rm(resolvePath(key), { force: true })
    },

    async exists(key) {
      try {
        await access(resolvePath(key))
        return true
      }
      catch {
        return false
      }
    },

    publicUrl(key) {
      return buildPublicUrl(key, publicPrefix)
    },
  }
}
