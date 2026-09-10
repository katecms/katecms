import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  can,
  findCollectionBySlugPath,
  matchCollectionPath,
} from '@miraicms/core'
import { getDb } from '../../utils/db'
import { getCurrentUser } from '../../utils/session'
import {
  fail,
  getCollectionDefinition,
  getCollections,
  toAdminEntry,
  toCollectionMeta,
} from '../../utils/collections'
import {
  isTruthyQueryParam,
  parsePublicStatusParam,
  resolvePublicStatuses,
} from '../../../utils/preview'
import type { ResolveResponse } from '../../../utils/collections'

/**
 * Public resolve: map a frontend path to a collection entry via `rewrite`.
 *
 * Query:
 * - `path` (required) — public URL, e.g. `/inf/about`
 * - `preview` — `1`/`true`/`yes` to include drafts when the requester may
 *   `collections:read` the matched collection
 * - `status` — `published`, `draft`, or comma-separated; `draft` is ignored
 *   unless preview is granted. Trash is never returned.
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
  const matched = matchCollectionPath(collections, path)
  if (!matched) {
    fail(404, 'Page not found.')
  }

  const def = getCollectionDefinition(matched.collectionSlug)
  if (!def) {
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

  const row = await findCollectionBySlugPath(
    getDb(),
    matched.collectionSlug,
    matched.segments,
    statuses,
  )
  if (!row) {
    fail(404, 'Page not found.')
  }

  return {
    collection: toCollectionMeta(matched.collectionSlug, def),
    entry: toAdminEntry(row, matched.slugPath),
    preview,
  }
})
