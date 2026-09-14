import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createCollection, listCollectionParentOptions, loadCollectionSlugPath } from '@miraicms/core'
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
  requirePublishedFields,
  rethrowCollectionWriteError,
  toAdminEntry,
  toCollectionMeta,
  toParentOption,
} from '../../../utils/collections'
import type { CollectionEntryResponse } from '../../../../utils/collections'
import {
  applyDictionaryAssignments,
  loadCollectionDictionaryPickers,
  selectedDictionaryIds,
} from '../../../utils/dictionaries'

interface CreateBody {
  title?: unknown
  slug?: unknown
  status?: unknown
  fields?: unknown
  parentId?: unknown
  menuOrder?: unknown
  publishedAt?: unknown
  dictionaries?: unknown
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

  requirePublishedFields(def, status, fields)

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
    if (body?.dictionaries !== undefined) {
      await applyDictionaryAssignments(db, row.id, collectionSlug, body.dictionaries)
    }
    const slugPath = (await loadCollectionSlugPath(db, collectionSlug, row.id)) || row.slug
    const flags = entryFlags(actor, row, roles)
    const meta = toCollectionMeta(collectionSlug, def)
    const pickers = await loadCollectionDictionaryPickers(db, collectionSlug)
    const dictionaryIds = await selectedDictionaryIds(db, row.id, pickers)
    const response: CollectionEntryResponse = {
      collection: meta,
      entry: toAdminEntry(row, slugPath, { ...flags, dictionaryIds }),
      canUpdate: flags.canUpdate,
      canDelete: flags.canDelete,
      dictionaries: pickers,
    }
    if (meta.hierarchical) {
      const parents = await listCollectionParentOptions(db, collectionSlug, row.id)
      response.parents = parents.map(toParentOption)
    }
    return response
  }
  catch (error) {
    rethrowCollectionWriteError(error)
  }
})
