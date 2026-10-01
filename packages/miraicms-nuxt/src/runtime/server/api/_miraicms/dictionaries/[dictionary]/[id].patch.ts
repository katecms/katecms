import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { can, findDictionaryById, listDictionaries, updateDictionary } from '@miraicms/core'
import type { DictionaryUpdate } from '@miraicms/core'
import { getDb } from '../../../../utils/db'
import { requireUser } from '../../../../utils/session'
import { requirePermission } from '../../../../utils/permissions'
import {
  assertDictionaryParent,
  fail,
  flattenDictionaryTerms,
  listDictionaryParentOptions,
  readDictionarySlug,
  readEntryId,
  readFields,
  readParentId,
  readSlug,
  readTitle,
  requireDictionary,
  requireTermFields,
  rethrowDictionaryWriteError,
  toAdminTerm,
  toDictionaryMeta,
} from '../../../../utils/dictionaries'
import type { DictionaryTermResponse } from '../../../../../utils/dictionaries'

interface PatchBody {
  title?: unknown
  slug?: unknown
  fields?: unknown
  parentId?: unknown
}

/** Partial update of a dictionary term. */
export default defineEventHandler(async (event): Promise<DictionaryTermResponse> => {
  const actor = await requireUser(event)
  const dictionarySlug = readDictionarySlug(getRouterParam(event, 'dictionary'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const def = requireDictionary(dictionarySlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'dictionaries', 'update', roles, dictionarySlug)

  const db = getDb()
  const existing = await findDictionaryById(db, id)
  if (!existing || existing.type !== dictionarySlug) {
    fail(404, 'Term not found.')
  }

  const body = await readBody<PatchBody>(event)
  const patch: DictionaryUpdate = {}

  if (body?.title !== undefined) {
    patch.title = readTitle(body.title)
  }
  if (body?.slug !== undefined) {
    patch.slug = readSlug(body.slug)
  }
  if (body?.fields !== undefined) {
    patch.fields = readFields(body.fields)
  }
  if (def.hierarchical === true && body?.parentId !== undefined) {
    patch.parent_id = readParentId(body.parentId)
  }

  const nextFields = (patch.fields ?? existing.fields ?? {}) as Record<string, unknown>
  requireTermFields(def, nextFields)

  const rows = await listDictionaries(db, dictionarySlug)
  assertDictionaryParent(
    rows,
    dictionarySlug,
    patch.parent_id !== undefined ? patch.parent_id : existing.parent_id,
    id,
  )

  try {
    const row = await updateDictionary(db, id, patch)
    if (!row) {
      fail(404, 'Term not found.')
    }
    const nextRows = await listDictionaries(db, dictionarySlug)
    const listed = flattenDictionaryTerms(nextRows)
    const node = listed.find(item => item.row.id === row.id)
    const canUpdate = can(actor, 'dictionaries', 'update', { roles, scope: dictionarySlug })
    const canDelete = can(actor, 'dictionaries', 'delete', { roles, scope: dictionarySlug })
    return {
      dictionary: toDictionaryMeta(dictionarySlug, def),
      term: toAdminTerm(row, node?.slugPath ?? row.slug, {
        canUpdate,
        canDelete,
        depth: node?.depth,
      }),
      canUpdate,
      canDelete,
      parents: listDictionaryParentOptions(nextRows, id),
    }
  }
  catch (error) {
    rethrowDictionaryWriteError(error)
  }
})
