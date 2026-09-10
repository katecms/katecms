import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { findCollectionById, listCollectionParentOptions, loadCollectionSlugPath } from '@miraicms/core'
import { getDb } from '../../../../utils/db'
import { requireUser } from '../../../../utils/session'
import { requirePermission } from '../../../../utils/permissions'
import {
  entryFlags,
  fail,
  readCollectionSlug,
  readEntryId,
  requireCollection,
  toAdminEntry,
  toCollectionMeta,
  toParentOption,
} from '../../../../utils/collections'
import type { CollectionEntryResponse } from '../../../../../utils/collections'

/** Fetch a single collection entry (including trash). */
export default defineEventHandler(async (event): Promise<CollectionEntryResponse> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const def = requireCollection(collectionSlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'collections', 'read', roles, collectionSlug)

  const db = getDb()
  const row = await findCollectionById(db, id)
  if (!row || row.type !== collectionSlug) {
    fail(404, 'Entry not found.')
  }

  const slugPath = (await loadCollectionSlugPath(db, collectionSlug, id)) || row.slug
  const flags = entryFlags(actor, row, roles)
  const meta = toCollectionMeta(collectionSlug, def)
  const response: CollectionEntryResponse = {
    collection: meta,
    entry: toAdminEntry(row, slugPath, flags),
    canUpdate: flags.canUpdate,
    canDelete: flags.canDelete,
  }

  if (meta.hierarchical) {
    const parents = await listCollectionParentOptions(db, collectionSlug, id)
    response.parents = parents.map(toParentOption)
  }

  return response
})
