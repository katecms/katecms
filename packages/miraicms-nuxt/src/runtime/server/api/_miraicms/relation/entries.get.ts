import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  can,
  listCollections,
} from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { requireUser } from '../../../utils/session'
import { getCollections, fail } from '../../../utils/collections'
import {
  RELATION_PICKER_LIMIT,
  collectionArchiveOption,
  pathMapForRows,
  pickFeaturedImage,
  readStringList,
  toPickerEntry,
} from '../../../utils/relation'

/**
 * Slim collection entries for `post_object`, `page_link`, and `relationship`.
 * Query: `postType` (comma-separated slugs), `q`, `featured=1`, `archives=1`.
 * Lists published and draft entries (not trash).
 */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  const collections = getCollections()
  const query = getQuery(event)
  const requested = readStringList(query.postType)
  const wanted = requested.length > 0
    ? requested.filter(slug => slug in collections)
    : Object.keys(collections)
  if (requested.length > 0 && wanted.length === 0) {
    fail(404, 'Collection not found.')
  }

  const readable = wanted.filter(slug => can(actor, 'collections', 'read', { roles, scope: slug }))
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const featured = query.featured === '1' || query.featured === 'true'
  const db = getDb()
  const entries = []

  for (const slug of readable) {
    const def = collections[slug]
    if (!def) {
      continue
    }
    const rows = await listCollections(db, slug, {
      status: 'active',
      search: search || undefined,
      limit: RELATION_PICKER_LIMIT,
    })
    const dictionarySlugs = readStringList(query.dictionary)
    let filtered = rows
    const ids = rows.map(row => row.id)
    const termIdsByEntry = new Map<number, number[]>()
    if (ids.length > 0) {
      const links = await db
        .selectFrom('collection_dictionaries')
        .select(['collection_id', 'dictionary_id'])
        .where('collection_id', 'in', ids)
        .execute()
      for (const link of links) {
        const current = termIdsByEntry.get(link.collection_id) ?? []
        current.push(link.dictionary_id)
        termIdsByEntry.set(link.collection_id, current)
      }
      if (dictionarySlugs.length > 0) {
        const typed = await db
          .selectFrom('collection_dictionaries')
          .innerJoin('dictionaries', 'dictionaries.id', 'collection_dictionaries.dictionary_id')
          .select('collection_dictionaries.collection_id as collection_id')
          .where('collection_dictionaries.collection_id', 'in', ids)
          .where('dictionaries.type', 'in', dictionarySlugs)
          .execute()
        const allowed = new Set(typed.map(link => link.collection_id))
        filtered = rows.filter(row => allowed.has(row.id))
      }
    }
    const paths = pathMapForRows(rows)
    for (const row of filtered) {
      entries.push(toPickerEntry(row, def, paths.get(row.id) ?? row.slug, {
        featuredImage: featured ? pickFeaturedImage(row.fields) : undefined,
        termIds: termIdsByEntry.get(row.id) ?? [],
      }))
    }
  }

  const archives = query.archives === '1' || query.archives === 'true'
    ? readable.flatMap((slug) => {
        const def = collections[slug]
        return def ? [collectionArchiveOption(slug, def)] : []
      })
    : []

  return { entries, archives }
})
