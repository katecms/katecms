import {
  buildPublicPath,
  buildSlugPathMap,
  isCollectionPublic,
  listCollectionsByDictionary,
  listDictionaries,
} from '@miraicms/core'
import type { Kysely } from 'kysely'
import type { Database } from '@miraicms/core'
import type { PublicDictionaryTerm, ResolveTermResponse } from '../../utils/collections'
import { getCollections } from './collections'
import { getDictionaries } from './dictionaries'

function pathSegments(path: string): string[] {
  const raw = path.trim().split(/[?#]/)[0] ?? ''
  return raw.split('/').filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part)
    }
    catch {
      return part
    }
  })
}

/**
 * Public term URL is `/{dictionary}/{slugPath}`.
 * A collection rewrite that matches the same path wins before this is called.
 */
export async function resolvePublicDictionaryTerm(
  db: Kysely<Database>,
  path: string,
): Promise<ResolveTermResponse | undefined> {
  const segments = pathSegments(path)
  if (segments.length < 2) {
    return undefined
  }
  const [type, ...rest] = segments
  if (!type) {
    return undefined
  }
  const def = getDictionaries()[type]
  if (!def) {
    return undefined
  }
  const slugPath = rest.join('/')
  const rows = await listDictionaries(db, type)
  const slugPaths = buildSlugPathMap(rows)
  const row = rows.find(item => (slugPaths.get(item.id) ?? item.slug) === slugPath)
  if (!row) {
    return undefined
  }

  const term: PublicDictionaryTerm = {
    id: row.id,
    type: row.type,
    slug: row.slug,
    slugPath,
    title: row.title,
    fields: (row.fields ?? {}) as Record<string, unknown>,
    parentId: row.parent_id,
  }
  const linked = await listCollectionsByDictionary(db, row.id)
  const collections = getCollections()
  const entries: ResolveTermResponse['entries'] = []
  const types = [...new Set(linked.filter(item => item.status === 'published').map(item => item.type))]
  for (const collectionType of types) {
    const collection = collections[collectionType]
    if (!collection || !isCollectionPublic(collection)) {
      continue
    }
    const family = await db
      .selectFrom('collections')
      .select(['id', 'slug', 'parent_id'])
      .where('type', '=', collectionType)
      .where('status', '!=', 'trash')
      .execute()
    const paths = buildSlugPathMap(family)
    for (const item of linked) {
      if (item.type !== collectionType || item.status !== 'published') {
        continue
      }
      const itemPath = paths.get(item.id) ?? item.slug
      if (!itemPath) {
        continue
      }
      entries.push({
        id: item.id,
        title: item.title,
        path: buildPublicPath(collection.rewrite, collectionType, itemPath),
      })
    }
  }

  return {
    kind: 'term',
    dictionary: {
      slug: type,
      labels: {
        name: def.labels.name,
        singularName: def.labels.singularName || def.labels.name,
      },
    },
    term,
    entries,
    path: `/${type}/${slugPath}`.replace(/\/{2,}/g, '/'),
  }
}
