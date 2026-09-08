import { defineEventHandler } from 'h3'
import { listMedia } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { toClientMedia, uploaderNames } from '../../../utils/media'

/** List media library entries, newest first. No auth yet. */
export default defineEventHandler(async (): Promise<{ media: MediaItem[] }> => {
  const rows = await listMedia(getDb(), { limit: 500 })
  const names = await uploaderNames(rows.map(row => row.uploaded_by))
  return {
    media: rows.map(row => toClientMedia(
      row,
      row.uploaded_by != null ? names.get(row.uploaded_by) ?? null : null,
    )),
  }
})
