import { extname } from 'node:path'
import { createError, defineEventHandler, getRequestURL, setHeader } from 'h3'
import { getMediaStorage } from '../../utils/media'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
}

/** Serve uploaded files from the media storage directory. */
export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  const prefix = '/uploads/'
  if (!pathname.startsWith(prefix)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }

  const key = decodeURIComponent(pathname.slice(prefix.length))
  const storage = getMediaStorage()
  if (!key || !(await storage.exists(key))) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }

  const data = await storage.get(key)
  setHeader(event, 'Content-Type', MIME_BY_EXT[extname(key).toLowerCase()] || 'application/octet-stream')
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return data
})
