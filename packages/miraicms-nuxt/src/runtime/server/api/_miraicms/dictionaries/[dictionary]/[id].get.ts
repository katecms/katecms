import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { can, findDictionaryById, listDictionaries } from '@miraicms/core'
import { getDb } from '../../../../utils/db'
import { requireUser } from '../../../../utils/session'
import { requirePermission } from '../../../../utils/permissions'
import {
  fail,
  flattenDictionaryTerms,
  listDictionaryParentOptions,
  readDictionarySlug,
  readEntryId,
  requireDictionary,
  toAdminTerm,
  toDictionaryMeta,
} from '../../../../utils/dictionaries'
import type { DictionaryTermResponse } from '../../../../../utils/dictionaries'

/** Fetch a single dictionary term. */
export default defineEventHandler(async (event): Promise<DictionaryTermResponse> => {
  const actor = await requireUser(event)
  const dictionarySlug = readDictionarySlug(getRouterParam(event, 'dictionary'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const def = requireDictionary(dictionarySlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'dictionaries', 'read', roles, dictionarySlug)

  const db = getDb()
  const row = await findDictionaryById(db, id)
  if (!row || row.type !== dictionarySlug) {
    fail(404, 'Term not found.')
  }

  const rows = await listDictionaries(db, dictionarySlug)
  const listed = flattenDictionaryTerms(rows)
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
    parents: listDictionaryParentOptions(rows, id),
  }
})
