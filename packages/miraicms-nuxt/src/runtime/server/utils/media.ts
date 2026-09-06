import { useRuntimeConfig } from '#imports'
import { createError } from 'h3'
import {
  createLocalMediaStorage,
  toMediaItem,
} from '@miraicms/core'
import type { Media, MediaItem, MediaStorage, ResolvedMediaConfig } from '@miraicms/core'

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
