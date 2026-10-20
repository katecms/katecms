import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { findCollectionById } from '@miraicms/core'
import { getDb } from '../../../../utils/db'
import { requireUser } from '../../../../utils/session'
import { requirePermission } from '../../../../utils/permissions'
import {
  fail,
  readCollectionSlug,
  readEntryId,
  requireCollection,
  collectionRevisionsEnabled,
} from '../../../../utils/collections'
import { listEntryRevisions } from '../../../../utils/revisions'
import type { EntryRevisionItem } from '../../../../../utils/collections'

/** Saved versions of one collection entry. */
export default defineEventHandler(async (event): Promise<{ revisions: EntryRevisionItem[] }> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const def = requireCollection(collectionSlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'collections', 'read', roles, collectionSlug)

  const db = getDb()
  const existing = await findCollectionById(db, id)
  if (!existing || existing.type !== collectionSlug) {
    fail(404, 'Entry not found.')
  }
  if (!collectionRevisionsEnabled(def)) {
    return { revisions: [] }
  }
  return { revisions: await listEntryRevisions(db, id) }
})
