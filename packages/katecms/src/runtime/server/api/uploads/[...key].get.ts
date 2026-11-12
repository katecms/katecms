import { createError, defineEventHandler, getRequestURL, setHeader } from 'h3'
import { getMediaStorage } from '../../utils/media'
import { uploadResponseHeaders } from '../../utils/upload-headers'

/** Serve uploaded files from the media storage directory. */
export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  const prefix = '/uploads/'
  if (!pathname.startsWith(prefix)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }

  const key = decodeURIComponent(pathname.slice(prefix.length))
  const storage = getMediaStorage()
  let data: Buffer
  try {
    if (!key || !(await storage.exists(key))) {
      throw createError({ statusCode: 404, statusMessage: 'File not found.' })
    }
    data = await storage.get(key)
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }

  for (const [name, value] of Object.entries(uploadResponseHeaders(key))) {
    setHeader(event, name, value)
  }
  return data
})
