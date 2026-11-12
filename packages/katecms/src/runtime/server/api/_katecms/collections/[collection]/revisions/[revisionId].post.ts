import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  findCollectionById,
  findCollectionRevisionById,
  listCollectionParentOptions,
  loadCollectionSlugPath,
  updateCollection,
} from '@katecms/core'
import { getDb } from '../../../../../utils/db'
import { requireUser } from '../../../../../utils/session'
import { requireEntryPermission, requirePermission } from '../../../../../utils/permissions'
import {
  entryFlags,
  fail,
  readCollectionSlug,
  readEntryId,
  readFields,
  readMenuOrder,
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
  collectionRevisionsEnabled,
} from '../../../../../utils/collections'
import type { CollectionEntryResponse } from '../../../../../../utils/collections'
import {
  applyDictionaryAssignments,
  loadCollectionDictionaryPickers,
  selectedDictionaryIds,
} from '../../../../../utils/dictionaries'
import {
  entryRevisionSnapshot,
  readEntryRevisionData,
  recordEntryRevision,
  revisionAuthorId,
} from '../../../../../utils/revisions'

/** Replace an entry with a saved revision. The current state stays in the revision list. */
export default defineEventHandler(async (event): Promise<CollectionEntryResponse> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const revisionId = readRevisionId(getRouterParam(event, 'revisionId'))
  const def = requireCollection(collectionSlug)
  if (!collectionRevisionsEnabled(def)) {
    fail(404, 'Revisions are disabled for this collection.')
  }
  const roles = useRuntimeConfig().katecms?.roles ?? {}
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

  const revision = await findCollectionRevisionById(db, revisionId)
  if (!revision || revision.collection_id !== id) {
    fail(404, 'Revision not found.')
  }
  const snapshot = readEntryRevisionData(revision.data)
  const title = readTitle(snapshot.title)
  const slug = readSlug(snapshot.slug)
  const status = readStatus(snapshot.status, existing.status)
  const fields = readFields(snapshot.fields)
  requirePublishedFields(def, status, fields)
  const publishedAt = readPublishedAt(snapshot.publishedAt)
  const authorId = await revisionAuthorId(db, snapshot.authorId)

  const pickers = await loadCollectionDictionaryPickers(db, collectionSlug)
  const previous = entryRevisionSnapshot(existing, await selectedDictionaryIds(db, id, pickers))

  try {
    const row = await updateCollection(db, id, {
      title,
      slug,
      status,
      fields,
      menu_order: readMenuOrder(snapshot.menuOrder, existing.menu_order),
      published_at: publishedAt,
      author_id: authorId,
      ...(def.hierarchical === true ? { parent_id: snapshot.parentId } : {}),
    })
    if (!row) {
      fail(404, 'Entry not found.')
    }
    await applyDictionaryAssignments(db, id, collectionSlug, snapshot.dictionaryIds)
    const dictionaryIds = await selectedDictionaryIds(db, id, pickers)
    await recordEntryRevision(db, id, actor.id, previous, entryRevisionSnapshot(row, dictionaryIds))

    const slugPath = (await loadCollectionSlugPath(db, collectionSlug, id)) || row.slug
    const flags = entryFlags(actor, row, roles)
    const meta = toCollectionMeta(collectionSlug, def)
    const response: CollectionEntryResponse = {
      collection: meta,
      entry: toAdminEntry(row, slugPath, { ...flags, dictionaryIds }),
      canUpdate: flags.canUpdate,
      canDelete: flags.canDelete,
      dictionaries: pickers,
    }
    if (meta.hierarchical) {
      const parents = await listCollectionParentOptions(db, collectionSlug, id)
      response.parents = parents.map(toParentOption)
    }
    return response
  }
  catch (error) {
    rethrowCollectionWriteError(error)
  }
})

function readRevisionId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    fail(400, 'Invalid revision.')
  }
  return id
}
