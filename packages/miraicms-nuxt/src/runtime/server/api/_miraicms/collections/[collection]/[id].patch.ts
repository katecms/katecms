import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { findCollectionById, loadCollectionSlugPath, updateCollection } from '@miraicms/core'
import type { CollectionUpdate } from '@miraicms/core'
import { getDb } from '../../../../utils/db'
import { requireUser } from '../../../../utils/session'
import { requireEntryPermission, requirePermission } from '../../../../utils/permissions'
import {
  entryFlags,
  fail,
  readCollectionSlug,
  readEntryId,
  readFields,
  readMenuOrder,
  readParentId,
  readPublishedAt,
  readSlug,
  readStatus,
  readTitle,
  requireCollection,
  rethrowCollectionWriteError,
  toAdminEntry,
  toCollectionMeta,
} from '../../../../utils/collections'
import type { CollectionEntryResponse } from '../../../../../utils/collections'

interface PatchBody {
  title?: unknown
  slug?: unknown
  status?: unknown
  fields?: unknown
  parentId?: unknown
  menuOrder?: unknown
  publishedAt?: unknown
}

/** Partial update of a collection entry (including restore / move to trash). */
export default defineEventHandler(async (event): Promise<CollectionEntryResponse> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const def = requireCollection(collectionSlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'collections', 'update', roles, collectionSlug)

  const db = getDb()
  const existing = await findCollectionById(db, id)
  if (!existing || existing.type !== collectionSlug) {
    fail(404, 'Entry not found.')
  }

  requireEntryPermission(
    actor,
    'collections',
    'update',
    { authorId: existing.author_id },
    roles,
    collectionSlug,
  )

  const body = await readBody<PatchBody>(event)
  const patch: CollectionUpdate = {}

  if (body?.title !== undefined) {
    patch.title = readTitle(body.title)
  }
  if (body?.slug !== undefined) {
    patch.slug = readSlug(body.slug)
  }
  if (body?.fields !== undefined) {
    patch.fields = readFields(body.fields)
  }
  if (body?.menuOrder !== undefined) {
    patch.menu_order = readMenuOrder(body.menuOrder)
  }
  if (def.hierarchical === true && body?.parentId !== undefined) {
    patch.parent_id = readParentId(body.parentId)
  }
  if (body?.status !== undefined) {
    patch.status = readStatus(body.status, existing.status)
  }
  if (body?.publishedAt !== undefined) {
    const publishedAt = readPublishedAt(body.publishedAt)
    const nextStatus = patch.status ?? existing.status
    if (nextStatus === 'published' && publishedAt == null) {
      // Keep existing date (or let core fill on first publish).
    }
    else {
      patch.published_at = publishedAt
    }
  }

  try {
    const row = await updateCollection(db, id, patch)
    if (!row) {
      fail(404, 'Entry not found.')
    }
    const slugPath = (await loadCollectionSlugPath(db, collectionSlug, id)) || row.slug
    const flags = entryFlags(actor, row, roles)
    return {
      collection: toCollectionMeta(collectionSlug, def),
      entry: toAdminEntry(row, slugPath, flags),
      canUpdate: flags.canUpdate,
      canDelete: flags.canDelete,
    }
  }
  catch (error) {
    rethrowCollectionWriteError(error)
  }
})
