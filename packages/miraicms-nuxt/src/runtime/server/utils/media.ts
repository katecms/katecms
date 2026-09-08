import { useRuntimeConfig } from '#imports'
import type { H3Event } from 'h3'
import { createError } from 'h3'
import {
  createLocalMediaStorage,
  findUserById,
  toMediaItem,
} from '@miraicms/core'
import type { Media, MediaItem, MediaStorage, ResolvedMediaConfig, StoredMediaVariant } from '@miraicms/core'
import { getDb } from './db'

/** Public URL prefix; files in `public/uploads` are served here by Nuxt. */
export const UPLOADS_PUBLIC_PATH = '/uploads'

let storage: MediaStorage | undefined

export function getMediaConfig(): ResolvedMediaConfig {
  const media = useRuntimeConfig().miraicms?.media
  if (!media?.dir) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Media upload directory is not configured.',
    })
  }
  return media
}

export function getMediaStorage(): MediaStorage {
  if (storage) {
    return storage
  }
  storage = createLocalMediaStorage({
    dir: getMediaConfig().dir!,
    publicPrefix: UPLOADS_PUBLIC_PATH,
  })
  return storage
}

export function toClientMedia(row: Media, uploadedByName?: string | null): MediaItem {
  return toMediaItem(row, {
    publicUrl: key => getMediaStorage().publicUrl(key),
    uploadedByName,
  })
}

export function parseMediaId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id.' })
  }
  return id
}

export function storedVariants(value: unknown): StoredMediaVariant[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((row): row is StoredMediaVariant => {
    if (!row || typeof row !== 'object') {
      return false
    }
    const variant = row as Partial<StoredMediaVariant>
    return typeof variant.filename === 'string'
      && typeof variant.size === 'string'
      && typeof variant.format === 'string'
  })
}

export async function uploaderNames(
  ids: Array<number | null | undefined>,
): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((id): id is number => typeof id === 'number'))]
  const names = new Map<number, string>()
  const db = getDb()
  await Promise.all(unique.map(async (id) => {
    const user = await findUserById(db, id)
    if (user) {
      names.set(id, user.name?.trim() || user.email)
    }
  }))
  return names
}

export async function toClientMediaRow(row: Media): Promise<MediaItem> {
  const names = await uploaderNames([row.uploaded_by])
  return toClientMedia(row, row.uploaded_by != null ? names.get(row.uploaded_by) ?? null : null)
}

export function scheduleBackground(event: H3Event, task: Promise<unknown>): void {
  const waitUntil = (event as { waitUntil?: (promise: Promise<unknown>) => void }).waitUntil
  if (typeof waitUntil === 'function') {
    waitUntil(task)
  }
}
