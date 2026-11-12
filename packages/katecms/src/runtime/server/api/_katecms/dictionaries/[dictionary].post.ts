import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { can, createDictionary, listDictionaries } from '@katecms/core'
import { getDb } from '../../../utils/db'
import { requireUser } from '../../../utils/session'
import { requirePermission } from '../../../utils/permissions'
import {
  assertDictionaryParent,
  flattenDictionaryTerms,
  listDictionaryParentOptions,
  readDictionarySlug,
  readFields,
  readParentId,
  readSlug,
  readTitle,
  requireDictionary,
  requireTermFields,
  rethrowDictionaryWriteError,
  toAdminTerm,
  toDictionaryMeta,
} from '../../../utils/dictionaries'
import type { DictionaryTermResponse } from '../../../../utils/dictionaries'

interface CreateBody {
  title?: unknown
  slug?: unknown
  fields?: unknown
  parentId?: unknown
}

/** Create a term in the given dictionary. */
export default defineEventHandler(async (event): Promise<DictionaryTermResponse> => {
  const actor = await requireUser(event)
  const dictionarySlug = readDictionarySlug(getRouterParam(event, 'dictionary'))
  const def = requireDictionary(dictionarySlug)
  const roles = useRuntimeConfig().katecms?.roles ?? {}
  requirePermission(actor, 'dictionaries', 'create', roles, dictionarySlug)

  const body = await readBody<CreateBody>(event)
  const title = readTitle(body?.title)
  const slug = readSlug(body?.slug)
  const fields = readFields(body?.fields)
  const parentId = def.hierarchical === true ? readParentId(body?.parentId) : null
  requireTermFields(def, fields)

  const db = getDb()
  const existing = await listDictionaries(db, dictionarySlug)
  assertDictionaryParent(existing, dictionarySlug, parentId)

  try {
    const row = await createDictionary(db, {
      type: dictionarySlug,
      title,
      slug,
      fields,
      parent_id: parentId,
    })
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
      parents: listDictionaryParentOptions(rows, row.id),
    }
  }
  catch (error) {
    rethrowDictionaryWriteError(error)
  }
})
