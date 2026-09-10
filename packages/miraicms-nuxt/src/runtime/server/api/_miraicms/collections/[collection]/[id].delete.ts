import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { deleteCollection, findCollectionById } from '@miraicms/core'
import { getDb } from '../../../../utils/db'
import { requireUser } from '../../../../utils/session'
import { requireEntryPermission, requirePermission } from '../../../../utils/permissions'
import {
  fail,
  readCollectionSlug,
  readEntryId,
  requireCollection,
  toCollectionMeta,
} from '../../../../utils/collections'
import type { AdminCollectionMeta } from '../../../../../utils/collections'

/**
 * Permanently delete an entry. Move to trash with PATCH `{ status: 'trash' }`.
 */
export default defineEventHandler(async (event): Promise<{ collection: AdminCollectionMeta, ok: true }> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const def = requireCollection(collectionSlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'collections', 'delete', roles, collectionSlug)

  const db = getDb()
  const existing = await findCollectionById(db, id)
  if (!existing || existing.type !== collectionSlug) {
    fail(404, 'Entry not found.')
  }

  requireEntryPermission(
    actor,
    'collections',
    'delete',
    { authorId: existing.author_id },
    roles,
    collectionSlug,
  )

  await deleteCollection(db, id)

  return {
    collection: toCollectionMeta(collectionSlug, def),
    ok: true,
  }
})
