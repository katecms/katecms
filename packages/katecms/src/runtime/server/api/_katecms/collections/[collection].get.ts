import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  buildSlugPathMap,
  can,
  collectionListPaging,
  collectionPerPage,
  countCollections,
  countCollectionStatuses,
  flattenCollectionTree,
  COLLECTION_LIST_SORTS,
  isUnlimitedPerPage,
  listCollectionMonths,
  listCollectionParentOptions,
  listCollections,
} from '@katecms/core'
import type { CollectionListSort } from '@katecms/core'
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
import { loadCollectionDictionaryPickers } from '../../../utils/dictionaries'

function pageCollectionTree<T>(
  tree: Array<{ row: T, depth: number }>,
  page: number,
  perPage: number,
): Array<{ row: T, depth: number }> {
  if (isUnlimitedPerPage(perPage)) {
    return tree
  }
  return tree.slice((page - 1) * perPage, page * perPage)
}

function readRaw(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}

function readMonth(value: unknown): string {
  const raw = readRaw(value)
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : ''
}

function readOffset(value: unknown): number {
  const raw = readRaw(value)
  if (!raw) {
    return 0
  }
  const n = Number(raw)
  if (!Number.isInteger(n)) {
    return 0
  }
  return Math.max(-14 * 60, Math.min(14 * 60, n))
}

function readSort(value: unknown): CollectionListSort {
  const raw = readRaw(value)
  return (COLLECTION_LIST_SORTS as readonly string[]).includes(raw)
    ? raw as CollectionListSort
    : 'date-desc'
}

/**
 * List collection entries. Query: `status` (all|published|draft|trash),
 * `q`, `month` (`YYYY-MM`), `sort`, `tz` (UTC offset minutes), `page`, `perPage`.
 * Default `status=all` excludes trash. Default sort is newest list date.
 */
export default defineEventHandler(async (event): Promise<CollectionListResponse> => {
  const actor = await requireUser(event)
  const collectionSlug = readCollectionSlug(getRouterParam(event, 'collection'))
  const def = requireCollection(collectionSlug)
  const roles = useRuntimeConfig().katecms?.roles ?? {}
  requirePermission(actor, 'collections', 'read', roles, collectionSlug)

  const query = getQuery(event)
  const listStatus = readListStatus(query.status)
  const search = readSearch(query.q)
  const month = readMonth(query.month)
  const offsetMinutes = readOffset(query.tz)
  const sort = readSort(query.sort)
  const page = readPage(query.page)
  const perPage = readPerPage(query.perPage, collectionPerPage(def))
  const db = getDb()
  const meta = toCollectionMeta(collectionSlug, def)
  const paging = meta.hierarchical
    ? {}
    : collectionListPaging(page, perPage)
  const listOptions = {
    status: listStatus,
    search,
    month,
    offsetMinutes,
    sort,
  }

  const [rows, total, counts, pathRows, months] = await Promise.all([
    listCollections(db, collectionSlug, {
      ...listOptions,
      ...paging,
    }),
    countCollections(db, collectionSlug, listOptions),
    countCollectionStatuses(db, collectionSlug),
    db.selectFrom('collections')
      .select(['id', 'slug', 'parent_id'])
      .where('type', '=', collectionSlug)
      .execute(),
    listCollectionMonths(db, collectionSlug, {
      status: listStatus,
      search,
      offsetMinutes,
    }),
  ])

  const paths = buildSlugPathMap(pathRows)
  const listed = meta.hierarchical
    ? pageCollectionTree(flattenCollectionTree(rows), page, perPage)
    : rows.map(row => ({ row, depth: 0 }))

  const authorIds = [...new Set(
    listed
      .map(({ row }) => row.author_id)
      .filter((id): id is number => id != null),
  )]
  const authors = authorIds.length > 0
    ? await db
        .selectFrom('users')
        .select(['id', 'name', 'email'])
        .where('id', 'in', authorIds)
        .execute()
    : []
  const authorNameById = new Map(
    authors.map(user => [user.id, user.name?.trim() || user.email]),
  )

  const response: CollectionListResponse = {
    collection: meta,
    entries: listed.map(({ row, depth }) => toAdminEntry(
      row,
      paths.get(row.id) ?? row.slug,
      {
        ...entryFlags(actor, row, roles),
        authorName: row.author_id != null ? (authorNameById.get(row.author_id) ?? null) : null,
        ...(meta.hierarchical ? { depth } : {}),
      },
    )),
    counts,
    months,
    page,
    perPage,
    total,
    canCreate: can(actor, 'collections', 'create', { roles, scope: collectionSlug }),
    canUpdate: can(actor, 'collections', 'update', { roles, scope: collectionSlug }),
    canDelete: can(actor, 'collections', 'delete', { roles, scope: collectionSlug }),
  }

  response.dictionaries = await loadCollectionDictionaryPickers(db, collectionSlug)

  if (meta.hierarchical) {
    const parents = await listCollectionParentOptions(db, collectionSlug)
    response.parents = parents.map(toParentOption)
  }

  return response
})
