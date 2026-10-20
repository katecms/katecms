import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  contentMatchesMime,
  createMedia,
  generateVariants,
  hasImageWork,
  isMimeAllowed,
  isProcessableImage,
  prepareUploadKey,
  readImageSize,
  updateMedia,
} from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { getMediaConfig, getMediaStorage, scheduleBackground, toClientMediaRow } from '../../../utils/media'
import { requirePermission } from '../../../utils/permissions'
import { requireUser } from '../../../utils/session'

/**
 * Upload a single file to `public/uploads` and record its metadata.
 * Variant generation (if configured) runs in the background; poll GET by id.
 */
export default defineEventHandler(async (event): Promise<{ media: MediaItem }> => {
  const user = await requireUser(event)
  requirePermission(user, 'media', 'create', useRuntimeConfig().miraicms?.roles ?? {})

  const config = getMediaConfig()
  const storage = getMediaStorage()

  const parts = await readMultipartFormData(event)
  const filePart = parts?.find(part => part.name === 'file' && part.filename)
  if (!filePart || !filePart.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'File is missing.' })
  }

  const mimeType = (filePart.type || 'application/octet-stream').toLowerCase().split(';')[0]?.trim() || 'application/octet-stream'
  if (!isMimeAllowed(mimeType, config.allowedMimeTypes) || !contentMatchesMime(filePart.data, mimeType)) {
    throw createError({
      statusCode: 415,
      statusMessage: `File type is not allowed: ${mimeType}.`,
    })
  }
  if (filePart.data.length > config.maxFileSize * 1024 * 1024) {
    throw createError({
      statusCode: 413,
      statusMessage: `File exceeds the ${config.maxFileSize} MB limit.`,
    })
  }

  const data = filePart.data
  const key = await prepareUploadKey(filePart.filename, mimeType, name => storage.exists(name))
  await storage.put(key, data)

  const dimensions = mimeType.startsWith('image/') ? readImageSize(data) : null
  const willGenerate = isProcessableImage(mimeType) && hasImageWork(config)

  let row
  try {
    row = await createMedia(getDb(), {
      filename: key,
      mime_type: mimeType,
      filesize: data.length,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      alt: textPart(parts, 'alt'),
      caption: textPart(parts, 'caption'),
      uploaded_by: user.id,
      variants_status: willGenerate ? 'pending' : 'none',
    })
  }
  catch (error) {
    await storage.delete(key).catch(() => {})
    throw error
  }

  if (willGenerate) {
    const mediaId = row.id
    const task = generateVariants({ storage, key, mimeType, data, config })
      .then(async (variants) => {
        await updateMedia(getDb(), mediaId, {
          variants,
          variants_status: 'ready',
        })
      })
      .catch(async (error) => {
        console.error('[miraicms] failed to generate image variants', error)
        await updateMedia(getDb(), mediaId, { variants_status: 'failed' }).catch(() => {})
      })

    scheduleBackground(event, task)
  }

  return { media: await toClientMediaRow(row) }
})

function textPart(
  parts: Awaited<ReturnType<typeof readMultipartFormData>>,
  name: string,
): string | null {
  const part = parts?.find(p => p.name === name && !p.filename)
  const value = part?.data?.toString('utf-8').trim()
  return value || null
}
