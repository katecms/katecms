import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createCollection, loadCollectionSlugPath } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { requireUser } from '../../../utils/session'
import { requirePermission } from '../../../utils/permissions'
import {
  entryFlags,
  fail,
  readCollectionSlug,
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
} from '../../../utils/collections'
import type { CollectionEntryResponse } from '../../../../utils/collections'

interface CreateBody {
  title?: unknown
  slug?: unknown
  status?: unknown
  fields?: unknown
  parentId?: unknown
  menuOrder?: unknown
  publishedAt?: unknown
}

/** Create an entry in the given collection. */
export default defineEventHandler(async (event): Promise<CollectionEntryResponse> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const def = requireCollection(collectionSlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'collections', 'create', roles, collectionSlug)

  const body = await readBody<CreateBody>(event)
  const title = readTitle(body?.title)
  const slug = readSlug(body?.slug)
  const status = readStatus(body?.status, 'published')
  const fields = readFields(body?.fields)
  const parentId = def.hierarchical === true ? readParentId(body?.parentId) : null
  const menuOrder = readMenuOrder(body?.menuOrder, 0)
  const publishedAt = readPublishedAt(body?.publishedAt)

  if (status === 'trash') {
    fail(422, 'New entries cannot be created in the trash.')
  }

  const db = getDb()
  try {
    const row = await createCollection(db, {
      type: collectionSlug,
      title,
      slug,
      status,
      fields,
      parent_id: parentId,
      menu_order: menuOrder,
      author_id: actor.id,
      ...(publishedAt !== undefined ? { published_at: publishedAt } : {}),
    })
    const slugPath = (await loadCollectionSlugPath(db, collectionSlug, row.id)) || row.slug
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
