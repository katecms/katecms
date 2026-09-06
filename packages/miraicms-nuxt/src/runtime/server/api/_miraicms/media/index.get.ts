import { defineEventHandler } from 'h3'
import { listMedia } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { toClientMedia } from '../../../utils/media'
import type { MediaItem } from '@miraicms/core'

/** List media library entries, newest first. No auth yet. */
export default defineEventHandler(async (): Promise<{ media: MediaItem[] }> => {
  const rows = await listMedia(getDb(), { limit: 500 })
  return {
    media: rows.map(row => toClientMedia(row)),
  }
})
