import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  buildSlugPathMap,
  can,
  countCollections,
  countCollectionStatuses,
  flattenCollectionTree,
  listCollectionParentOptions,
  listCollections,
} from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { requireUser } from '../../../utils/session'
import { requirePermission } from '../../../utils/permissions'
import {
  entryFlags,
  readCollectionSlug,
  readListStatus,
  readPage,
  readPerPage,
  readSearch,
  requireCollection,
  toAdminEntry,
  toCollectionMeta,
  toParentOption,
} from '../../../utils/collections'
import type { CollectionListResponse } from '../../../../utils/collections'

/**
 * List collection entries. Query: `status` (all|published|draft|trash),
 * `q`, `page`, `perPage`. Default `status=all` excludes trash.
 */
export default defineEventHandler(async (event): Promise<CollectionListResponse> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const def = requireCollection(collectionSlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'collections', 'read', roles, collectionSlug)

  const query = getQuery(event)
  const listStatus = readListStatus(query.status)
  const search = readSearch(query.q)
  const page = readPage(query.page)
  const perPage = readPerPage(query.perPage)
  const db = getDb()
  const meta = toCollectionMeta(collectionSlug, def)
  const paging = meta.hierarchical
    ? {}
    : { limit: perPage, offset: (page - 1) * perPage }

  const [rows, total, counts, pathRows] = await Promise.all([
    listCollections(db, collectionSlug, {
      status: listStatus,
      search,
      ...paging,
    }),
    countCollections(db, collectionSlug, { status: listStatus, search }),
    countCollectionStatuses(db, collectionSlug),
    db.selectFrom('collections')
      .select(['id', 'slug', 'parent_id'])
      .where('type', '=', collectionSlug)
      .execute(),
  ])

  const paths = buildSlugPathMap(pathRows)
  const listed = meta.hierarchical
    ? flattenCollectionTree(rows).slice((page - 1) * perPage, page * perPage)
    : rows.map(row => ({ row, depth: 0 }))

  const response: CollectionListResponse = {
    collection: meta,
    entries: listed.map(({ row, depth }) => toAdminEntry(
      row,
      paths.get(row.id) ?? row.slug,
      { ...entryFlags(actor, row, roles), ...(meta.hierarchical ? { depth } : {}) },
    )),
    counts,
    page,
    perPage,
    total,
    canCreate: can(actor, 'collections', 'create', { roles, scope: collectionSlug }),
    canUpdate: can(actor, 'collections', 'update', { roles, scope: collectionSlug }),
    canDelete: can(actor, 'collections', 'delete', { roles, scope: collectionSlug }),
  }

  if (meta.hierarchical) {
    const parents = await listCollectionParentOptions(db, collectionSlug)
    response.parents = parents.map(toParentOption)
  }

  return response
})
