import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { isProcessableImage, listMedia, updateMedia } from '@katecms/core'
import { getDb } from '../../../utils/db'
import { scheduleBackground, storedVariants } from '../../../utils/media'
import { regenerateMedia } from '../../../utils/regenerate'
import { requirePermission } from '../../../utils/permissions'
import { requireUser } from '../../../utils/session'

/**
 * Queue variant regeneration for every processable image, one at a time.
 */
export default defineEventHandler(async (event): Promise<{ count: number }> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'media', 'update', useRuntimeConfig().katecms?.roles ?? {})

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
