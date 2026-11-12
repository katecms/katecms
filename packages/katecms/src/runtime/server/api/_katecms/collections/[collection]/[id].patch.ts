import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { findCollectionById, listCollectionParentOptions, loadCollectionSlugPath, updateCollection } from '@katecms/core'
import type { CollectionUpdate } from '@katecms/core'
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
  requirePublishedFields,
  resolveAuthorId,
  rethrowCollectionWriteError,
  toAdminEntry,
  toCollectionMeta,
  toParentOption,
  collectionRevisionsEnabled,
} from '../../../../utils/collections'
import type { CollectionEntryResponse } from '../../../../../utils/collections'
import {
  applyDictionaryAssignments,
  loadCollectionDictionaryPickers,
  selectedDictionaryIds,
} from '../../../../utils/dictionaries'
import { entryRevisionSnapshot, recordEntryRevision } from '../../../../utils/revisions'
interface PatchBody {
  title?: unknown
  slug?: unknown
  status?: unknown
  fields?: unknown
  parentId?: unknown
  menuOrder?: unknown
  publishedAt?: unknown
  authorId?: unknown
  dictionaries?: unknown
}

/** Partial update of a collection entry (including restore / move to trash). */
export default defineEventHandler(async (event): Promise<CollectionEntryResponse> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const def = requireCollection(collectionSlug)
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
  if (body?.authorId !== undefined) {
    patch.author_id = await resolveAuthorId(
      db,
      actor,
      roles,
      body.authorId,
      existing.author_id ?? actor.id,
    )
  }

  const nextStatus = patch.status ?? existing.status
  if (nextStatus === 'published') {
    const nextFields = (patch.fields ?? existing.fields ?? {}) as Record<string, unknown>
    requirePublishedFields(def, nextStatus, nextFields)
  }

  const trackRevisions = collectionRevisionsEnabled(def)
  const pickersBefore = await loadCollectionDictionaryPickers(db, collectionSlug)
  const previous = trackRevisions
    ? entryRevisionSnapshot(existing, await selectedDictionaryIds(db, id, pickersBefore))
    : null

  try {
    const row = await updateCollection(db, id, patch)
    if (!row) {
      fail(404, 'Entry not found.')
    }
    if (body?.dictionaries !== undefined) {
      await applyDictionaryAssignments(db, id, collectionSlug, body.dictionaries)
    }
    const slugPath = (await loadCollectionSlugPath(db, collectionSlug, id)) || row.slug
    const flags = entryFlags(actor, row, roles)
    const meta = toCollectionMeta(collectionSlug, def)
    const pickers = pickersBefore
    const dictionaryIds = await selectedDictionaryIds(db, id, pickers)
    if (trackRevisions && previous) {
      await recordEntryRevision(db, id, actor.id, previous, entryRevisionSnapshot(row, dictionaryIds))
    }
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
