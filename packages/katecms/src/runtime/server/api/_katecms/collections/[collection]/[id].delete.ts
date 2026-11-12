import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  canOnEntry,
  deleteCollection,
  deleteTrashedCollections,
  findCollectionById,
  listCollections,
} from '@katecms/core'
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

type DeleteEntryResult = { collection: AdminCollectionMeta, ok: true }
type EmptyTrashResult = { collection: AdminCollectionMeta, deleted: number }

/**
 * Permanently delete one entry (`/:id`) or every trashed entry the actor may
 * delete (`/trash`). Nitro would otherwise treat `trash` as `:id`.
 */
export default defineEventHandler(async (event): Promise<DeleteEntryResult | EmptyTrashResult> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const rawId = getRouterParam(event, 'id')
  const def = requireCollection(collectionSlug)
  const roles = useRuntimeConfig().katecms?.roles ?? {}
  requirePermission(actor, 'collections', 'delete', roles, collectionSlug)

  const db = getDb()

  if (rawId === 'trash') {
    const rows = await listCollections(db, collectionSlug, { status: 'trash' })
    const ids = rows
      .filter(row => canOnEntry(actor, 'collections', 'delete', { authorId: row.author_id }, {
        roles,
        scope: collectionSlug,
        userId: actor.id,
      }))
      .map(row => row.id)

    const deleted = await deleteTrashedCollections(db, collectionSlug, ids)
    return {
      collection: toCollectionMeta(collectionSlug, def),
      deleted,
    }
  }

  const id = readEntryId(rawId)
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
