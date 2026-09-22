import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { listMedia } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { toClientMedia, uploaderNames } from '../../../utils/media'
import { requirePermission } from '../../../utils/permissions'
import { requireUser } from '../../../utils/session'

/** List media library entries, newest first. Requires `media:read`. */
export default defineEventHandler(async (event): Promise<{ media: MediaItem[] }> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'media', 'read', useRuntimeConfig().miraicms?.roles ?? {})
  const rows = await listMedia(getDb(), { limit: 500 })
  const names = await uploaderNames(rows.map(row => row.uploaded_by))
  return {
    media: rows.map(row => toClientMedia(
      row,
      row.uploaded_by != null ? names.get(row.uploaded_by) ?? null : null,
    )),
  }
})
