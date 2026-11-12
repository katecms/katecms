import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { can, listDictionaries } from '@katecms/core'
import { getDb } from '../../../utils/db'
import { requireUser } from '../../../utils/session'
import { requirePermission } from '../../../utils/permissions'
import {
  flattenDictionaryTerms,
  listDictionaryParentOptions,
  readDictionarySlug,
  requireDictionary,
  toAdminTerm,
  toDictionaryMeta,
} from '../../../utils/dictionaries'
import type { DictionaryListResponse } from '../../../../utils/dictionaries'

/** List terms of a dictionary type. */
export default defineEventHandler(async (event): Promise<DictionaryListResponse> => {
  const actor = await requireUser(event)
  const dictionarySlug = readDictionarySlug(getRouterParam(event, 'dictionary'))
  const def = requireDictionary(dictionarySlug)
  const roles = useRuntimeConfig().katecms?.roles ?? {}
  requirePermission(actor, 'dictionaries', 'read', roles, dictionarySlug)

  const db = getDb()
  const rows = await listDictionaries(db, dictionarySlug)
  const listed = flattenDictionaryTerms(rows)
  const canUpdate = can(actor, 'dictionaries', 'update', { roles, scope: dictionarySlug })
  const canDelete = can(actor, 'dictionaries', 'delete', { roles, scope: dictionarySlug })

  return {
    dictionary: toDictionaryMeta(dictionarySlug, def),
    terms: listed.map(({ row, depth, slugPath }) => toAdminTerm(row, slugPath, {
      canUpdate,
      canDelete,
      depth,
    })),
    parents: listDictionaryParentOptions(rows),
    canCreate: can(actor, 'dictionaries', 'create', { roles, scope: dictionarySlug }),
    canUpdate,
    canDelete,
  }
})
