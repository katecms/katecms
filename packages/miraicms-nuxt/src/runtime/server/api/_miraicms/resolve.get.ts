import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  buildSlugPathMap,
  can,
  countCollections,
  findCollectionBySlugPath,
  listCollections,
  matchPublicCollectionRoute,
} from '@miraicms/core'
import type { CollectionListStatus, CollectionStatus } from '@miraicms/core'
import { getDb } from '../../utils/db'
import { getCurrentUser } from '../../utils/session'
import {
  fail,
  getCollectionDefinition,
  getCollections,
  readPage,
  readPerPage,
  toAdminEntry,
  toCollectionMeta,
} from '../../utils/collections'
import { loadAssignedEntryDictionaries } from '../../utils/dictionaries'
import {
  isTruthyQueryParam,
  parsePublicStatusParam,
  resolvePublicStatuses,
} from '../../../utils/preview'
import type { ResolveResponse } from '../../../utils/collections'

function listStatusFromPublic(statuses: CollectionStatus[]): CollectionListStatus {
  const published = statuses.includes('published')
  const draft = statuses.includes('draft')
  if (published && draft) {
    return 'active'
  }
  if (draft) {
    return 'draft'
  }
  return 'published'
}

/**
 * Public resolve: map a frontend path to a collection entry or archive.
 *
 * Query:
 * - `path` (required) — public URL, e.g. `/inf/about` or archive `/inf`
 * - `preview` — `1`/`true`/`yes` to include drafts when the requester may
 *   `collections:read` the matched collection
 * - `status` — `published`, `draft`, or comma-separated; `draft` is ignored
 *   unless preview is granted. Trash is never returned.
 * - `page` / `perPage` — archive listing only
 *
 * Unauthorized preview requests still resolve published entries only (404 if
 * the path is a draft), so existence is not leaked.
 */
export default defineEventHandler(async (event): Promise<ResolveResponse> => {
  const query = getQuery(event)
  const path = typeof query.path === 'string' ? query.path : ''
  if (!path.trim()) {
    fail(400, 'Missing path.')
  }

  const collections = getCollections()
  const matched = matchPublicCollectionRoute(collections, path)
  if (!matched) {
    fail(404, 'Page not found.')
  }

  const def = getCollectionDefinition(matched.collectionSlug)
  if (!def || def.public === false) {
    fail(404, 'Page not found.')
  }

  const previewRequested = isTruthyQueryParam(query.preview)
  const actor = previewRequested ? await getCurrentUser(event) : null
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  const previewAllowed = actor != null
    && can(actor, 'collections', 'read', { roles, scope: matched.collectionSlug })

  const { statuses, preview } = resolvePublicStatuses({
    previewRequested,
    previewAllowed,
    requested: parsePublicStatusParam(query.status),
  })

  const db = getDb()
  const meta = toCollectionMeta(matched.collectionSlug, def)

  if (matched.kind === 'archive') {
    const page = readPage(query.page)
    const perPage = readPerPage(query.perPage)
    const listStatus = listStatusFromPublic(statuses)
    const [rows, total, pathRows] = await Promise.all([
      listCollections(db, matched.collectionSlug, {
        status: listStatus,
        limit: perPage,
        offset: (page - 1) * perPage,
      }),
      countCollections(db, matched.collectionSlug, { status: listStatus }),
      db.selectFrom('collections')
        .select(['id', 'slug', 'parent_id'])
        .where('type', '=', matched.collectionSlug)
        .execute(),
    ])
    const paths = buildSlugPathMap(pathRows)
    const entries = await Promise.all(rows.map(async (row) => {
      const dictionaries = await loadAssignedEntryDictionaries(db, row.id, matched.collectionSlug)
      return toAdminEntry(row, paths.get(row.id) ?? row.slug, { dictionaries })
    }))

    return {
      kind: 'archive',
      collection: meta,
      entries,
      preview,
      page,
      perPage,
      total,
    }
  }

  const row = await findCollectionBySlugPath(
    db,
    matched.collectionSlug,
    matched.segments,
    statuses,
  )
  if (!row) {
    fail(404, 'Page not found.')
  }

  const dictionaries = await loadAssignedEntryDictionaries(db, row.id, matched.collectionSlug)

  return {
    kind: 'entry',
    collection: meta,
    entry: toAdminEntry(row, matched.slugPath, { dictionaries }),
    preview,
  }
})
