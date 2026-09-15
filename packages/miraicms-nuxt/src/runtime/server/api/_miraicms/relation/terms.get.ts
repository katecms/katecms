import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import { can, listDictionaries, toRelationTermValue } from '@miraicms/core'
import type { RelationTermValue } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { requireUser } from '../../../utils/session'
import {
  flattenDictionaryTerms,
  readDictionarySlug,
  requireDictionary,
} from '../../../utils/dictionaries'
import { fail } from '../../../utils/collections'

/**
 * Dictionary terms for the `dictionary` field and relationship filters.
 * Readable with `dictionaries:read` or `collections:read` on an attached collection.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const query = getQuery(event)
  const dictionarySlug = readDictionarySlug(
    typeof query.dictionary === 'string' ? query.dictionary : undefined,
  )
  const def = requireDictionary(dictionarySlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  const canReadDictionary = can(actor, 'dictionaries', 'read', { roles, scope: dictionarySlug })
  const canReadCollection = def.collections.some(slug => (
    can(actor, 'collections', 'read', { roles, scope: slug })
  ))
  if (!canReadDictionary && !canReadCollection) {
    fail(403, 'Insufficient permissions.')
  }

  const db = getDb()
  const rows = await listDictionaries(db, dictionarySlug)
  const listed = flattenDictionaryTerms(rows)
  const terms: RelationTermValue[] = listed.map(({ row, depth, slugPath }) => toRelationTermValue({
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    slugPath,
    fields: row.fields ?? {},
    parentId: row.parent_id,
    depth,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return {
    dictionary: {
      slug: dictionarySlug,
      labels: {
        name: def.labels.name,
        singularName: def.labels.singularName ?? def.labels.name,
      },
    },
    terms,
    canCreate: can(actor, 'dictionaries', 'create', { roles, scope: dictionarySlug }),
  }
})
