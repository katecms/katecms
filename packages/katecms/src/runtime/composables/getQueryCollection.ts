import { computed } from 'vue'
import { useAsyncData, useRequestFetch, useRoute } from '#imports'
import { buildPublicPath } from '@katecms/core'
import type { CollectionOrderField, DictionaryQuery, FieldsQuery } from '@katecms/core'
import type { AdminEntry, QueryCollectionResponse } from '../utils/collections'
import { isTruthyQueryParam, parsePublicStatusParam } from '../utils/preview'

export type QueryCollectionOrderBy = CollectionOrderField | 'date' | 'modified' | 'name' | 'includeIds'
export type QueryCollectionSlug = 'any' | (string & {})

export interface GetQueryCollectionOptions {
  /** Collection slug(s). `'any'` includes every public collection. */
  collection: QueryCollectionSlug | QueryCollectionSlug[]
  /**
   * Include drafts when the requester may `collections:read` every queried
   * collection. Also read from `?preview=1` on the current route.
   */
  preview?: boolean
  /**
   * Narrow statuses. `draft` is ignored unless preview is granted.
   * Also read from `?status=` on the current route.
   */
  status?: 'published' | 'draft' | Array<'published' | 'draft'>
  /** Listing page. Also read from `?page=` on the current route. */
  page?: number
  /**
   * Page size. Also read from `?perPage=` on the current route.
   * Default: the collection's `perPage` when a single type is queried,
   * otherwise 10. `-1` returns every match.
   */
  perPage?: number
  /** Title/slug search. */
  search?: string
  /** Exact title(s). */
  title?: string | string[]
  /** Only these entry ids. */
  includeIds?: number | number[]
  /** Skip these entry ids. */
  excludeIds?: number | number[]
  /** Parent id; `null` / `0` is top-level. */
  parentId?: number | null
  /** Entries whose parent id is in this list. `0` is top-level. */
  parentIds?: number | number[]
  /** Skip entries whose parent id is in this list. `0` is top-level. */
  excludeParentIds?: number | number[]
  /** Only these authors. */
  authorIn?: number[]
  /** Skip these authors. */
  authorNotIn?: number[]
  /** Entry slug(s). */
  slug?: string | string[]
  /** Entry slug(s). */
  slugs?: string | string[]
  /** Filter by dictionary rows (`relation` + `queries`). */
  dictionaryQuery?: DictionaryQuery
  /** Filter by entry `fields` JSON (`relation` + `queries`). */
  fieldsQuery?: FieldsQuery
  /** Sort field. `date` → `published_at`, `modified` → `updated_at`, `name` → `slug`, `includeIds` → `includeIds` order. */
  orderBy?: QueryCollectionOrderBy
  order?: 'asc' | 'desc'
}

function asList(value: string | string[] | number | number[] | undefined): string[] {
  if (value == null) {
    return []
  }
  const raw = Array.isArray(value) ? value : [value]
  return [...new Set(raw.map(item => String(item).trim()).filter(Boolean))]
}

function csv(value: string | string[] | number | number[] | undefined): string | undefined {
  const list = asList(value)
  return list.length > 0 ? list.join(',') : undefined
}

function csvAll(
  ...values: Array<string | string[] | number | number[] | undefined>
): string | undefined {
  const list = [...new Set(values.flatMap(value => asList(value)))]
  return list.length > 0 ? list.join(',') : undefined
}

function parentIdToken(value: number | null | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value == null || value === 0) {
    return 0
  }
  return value
}

function parentIdsCsv(
  parentId: number | null | undefined,
  parentIds: number | number[] | undefined,
): string | undefined {
  const tokens: number[] = []
  const seen = new Set<number>()
  const push = (value: number | undefined) => {
    if (value === undefined || seen.has(value)) {
      return
    }
    seen.add(value)
    tokens.push(value)
  }
  const list = parentIds == null
    ? []
    : Array.isArray(parentIds)
      ? parentIds
      : [parentIds]
  for (const id of list) {
    push(parentIdToken(id))
  }
  push(parentIdToken(parentId))
  return tokens.length > 0 ? tokens.join(',') : undefined
}

function statusQueryValue(
  status: GetQueryCollectionOptions['status'],
): string | undefined {
  if (!status) {
    return undefined
  }
  return Array.isArray(status) ? status.join(',') : status
}

function pageQueryValue(
  value: unknown,
  fallback?: number,
  allowUnlimited = false,
): number | undefined {
  if (
    typeof fallback === 'number'
    && Number.isInteger(fallback)
    && (fallback >= 1 || (allowUnlimited && fallback === -1))
  ) {
    return fallback
  }
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  if (allowUnlimited && n === -1) {
    return -1
  }
  if (!Number.isInteger(n) || n < 1) {
    return undefined
  }
  return n
}

/**
 * List public collection entries by filters.
 *
 * Collections with `public: false` are omitted. Results stay published-only
 * unless `preview` is set (option or `?preview=1`) and the visitor may read
 * every queried collection.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { entries, permalink } = await getQueryCollection({
 *   collection: 'any',
 *   perPage: 10,
 *   orderBy: 'date',
 * })
 * const mixed = await getQueryCollection({
 *   collection: ['post', 'page'],
 *   dictionaryQuery: {
 *     relation: 'AND',
 *     queries: [
 *       { dictionary: 'services', field: 'slug', terms: 'theme-1' },
 *       { dictionary: 'categories', operator: 'NOT IN', terms: 'category-1' },
 *     ],
 *   },
 * })
 * </script>
 * ```
 */
export async function getQueryCollection(options: GetQueryCollectionOptions) {
  const route = useRoute()
  const collection = computed(() => asList(options.collection).join(','))
  const preview = computed(() => options.preview ?? isTruthyQueryParam(route.query.preview))
  const status = computed(() =>
    statusQueryValue(options.status)
    ?? ((parsePublicStatusParam(route.query.status) ?? []).join(',') || undefined),
  )
  const page = computed(() => pageQueryValue(route.query.page, options.page))
  const perPage = computed(() => pageQueryValue(route.query.perPage, options.perPage, true))
  const search = computed(() => options.search)
  const title = computed(() => csv(options.title))
  const includeIds = computed(() => csv(options.includeIds))
  const excludeIds = computed(() => csv(options.excludeIds))
  const parentIds = computed(() => parentIdsCsv(options.parentId, options.parentIds))
  const excludeParentIds = computed(() => csv(options.excludeParentIds))
  const authorIn = computed(() => csv(options.authorIn))
  const authorNotIn = computed(() => csv(options.authorNotIn))
  const slug = computed(() => csvAll(options.slugs, options.slug))
  const dictionaryQuery = computed(() => (
    options.dictionaryQuery
      ? JSON.stringify(options.dictionaryQuery)
      : undefined
  ))
  const fieldsQuery = computed(() => (
    options.fieldsQuery
      ? JSON.stringify(options.fieldsQuery)
      : undefined
  ))
  const orderBy = computed(() => options.orderBy)
  const order = computed(() => options.order)
  const titleSet = computed(() => options.title !== undefined)
  const includeIdsSet = computed(() => options.includeIds !== undefined)
  const excludeIdsSet = computed(() => options.excludeIds !== undefined)
  const parentIdsSet = computed(() =>
    options.parentId !== undefined
    || options.parentIds !== undefined,
  )
  const excludeParentIdsSet = computed(() => options.excludeParentIds !== undefined)
  const authorInSet = computed(() => options.authorIn !== undefined)
  const authorNotInSet = computed(() => options.authorNotIn !== undefined)
  const slugSet = computed(() => options.slug !== undefined || options.slugs !== undefined)
  const requestFetch = useRequestFetch()

  const { data, pending, error, refresh } = await useAsyncData(
    [
      'katecms-query',
      collection.value,
      preview.value ? '1' : '0',
      status.value ?? '',
      page.value ?? '',
      perPage.value ?? '',
      search.value ?? '',
      titleSet.value ? title.value ?? '' : '-',
      includeIdsSet.value ? includeIds.value ?? '' : '-',
      excludeIdsSet.value ? excludeIds.value ?? '' : '-',
      parentIdsSet.value ? parentIds.value ?? '' : '-',
      excludeParentIdsSet.value ? excludeParentIds.value ?? '' : '-',
      authorInSet.value ? authorIn.value ?? '' : '-',
      authorNotInSet.value ? authorNotIn.value ?? '' : '-',
      slugSet.value ? slug.value ?? '' : '-',
      dictionaryQuery.value ?? '',
      fieldsQuery.value ?? '',
      orderBy.value ?? '',
      order.value ?? '',
    ].join(':'),
    () => requestFetch<QueryCollectionResponse>('/api/_katecms/query', {
      query: {
        collection: collection.value,
        ...(preview.value ? { preview: '1' } : {}),
        ...(status.value ? { status: status.value } : {}),
        ...(page.value ? { page: page.value } : {}),
        ...(perPage.value ? { perPage: perPage.value } : {}),
        ...(search.value ? { search: search.value } : {}),
        ...(titleSet.value ? { title: title.value ?? '' } : {}),
        ...(includeIdsSet.value ? { includeIds: includeIds.value ?? '' } : {}),
        ...(excludeIdsSet.value ? { excludeIds: excludeIds.value ?? '' } : {}),
        ...(parentIdsSet.value ? { parentIds: parentIds.value ?? '' } : {}),
        ...(excludeParentIdsSet.value ? { excludeParentIds: excludeParentIds.value ?? '' } : {}),
        ...(authorInSet.value ? { authorIn: authorIn.value ?? '' } : {}),
        ...(authorNotInSet.value ? { authorNotIn: authorNotIn.value ?? '' } : {}),
        ...(slugSet.value ? { slug: slug.value ?? '' } : {}),
        ...(dictionaryQuery.value ? { dictionaryQuery: dictionaryQuery.value } : {}),
        ...(fieldsQuery.value ? { fieldsQuery: fieldsQuery.value } : {}),
        ...(orderBy.value ? { orderBy: orderBy.value } : {}),
        ...(order.value ? { order: order.value } : {}),
      },
    }),
    {
      watch: [
        collection,
        preview,
        status,
        page,
        perPage,
        search,
        title,
        titleSet,
        includeIds,
        includeIdsSet,
        excludeIds,
        excludeIdsSet,
        parentIds,
        parentIdsSet,
        excludeParentIds,
        excludeParentIdsSet,
        authorIn,
        authorInSet,
        authorNotIn,
        authorNotInSet,
        slug,
        slugSet,
        dictionaryQuery,
        fieldsQuery,
        orderBy,
        order,
      ],
    },
  )

  const entries = computed(() => data.value?.entries ?? [])
  const collections = computed(() => data.value?.collections ?? [])
  const isPreview = computed(() => data.value?.preview === true)
  const queryPage = computed(() => data.value?.page ?? 1)
  const queryPerPage = computed(() => data.value?.perPage ?? 0)
  const total = computed(() => data.value?.total ?? 0)

  function permalink(item: AdminEntry): string | null {
    const meta = collections.value.find(entry => entry.slug === item.type)
    if (!meta || !meta.public) {
      return null
    }
    return buildPublicPath(meta.rewrite, meta.slug, item.slugPath || item.slug)
  }

  return {
    entries,
    collections,
    permalink,
    preview: isPreview,
    page: queryPage,
    perPage: queryPerPage,
    total,
    pending,
    error,
    refresh,
  }
}
