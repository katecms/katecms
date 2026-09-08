import { defineEventHandler } from 'h3'
import { isProcessableImage, listMedia, updateMedia } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { scheduleBackground, storedVariants } from '../../../utils/media'
import { regenerateMedia } from '../../../utils/regenerate'
import { requireUser } from '../../../utils/session'

/**
 * Queue variant regeneration for every processable image, one at a time.
 */
export default defineEventHandler(async (event): Promise<{ count: number }> => {
  await requireUser(event)

  const rows = await listMedia(getDb())
  const targets = rows.filter(row => isProcessableImage(row.mime_type))
  if (!targets.length) {
    return { count: 0 }
  }

  const db = getDb()
  await Promise.all(targets.map(row => updateMedia(db, row.id, { variants_status: 'pending' })))

  scheduleBackground(event, (async () => {
    for (const row of targets) {
      await regenerateMedia({
        id: row.id,
        filename: row.filename,
        mime_type: row.mime_type,
        variants: storedVariants(row.variants),
      })
    }
  })())

  return { count: targets.length }
})
