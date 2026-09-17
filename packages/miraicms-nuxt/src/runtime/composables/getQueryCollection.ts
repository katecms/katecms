import { computed } from 'vue'
import { useAsyncData, useRequestFetch, useRoute } from '#imports'
import { buildPublicPath } from '@miraicms/core'
import type { CollectionOrderField } from '@miraicms/core'
import type { AdminEntry, QueryCollectionResponse } from '../utils/collections'
import { isTruthyQueryParam, parsePublicStatusParam } from '../utils/preview'

export type QueryCollectionOrderBy = CollectionOrderField | 'date' | 'modified' | 'name'

export interface GetQueryCollectionOptions {
  /** Collection slug(s). */
  collection: string | string[]
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
  /** Only these entry ids. */
  include?: number | number[]
  /** Skip these entry ids. */
  exclude?: number | number[]
  /** Parent id; `null` / `0` is top-level. */
  parent?: number | null
  /** Author id(s). */
  author?: number | number[]
  /** Entry slug(s). */
  slug?: string | string[]
  /** Dictionary entry ids. */
  dictionaryIds?: number | number[]
  /** Match all dictionary ids (`AND`) or any (`OR`, default). */
  dictionaryRelation?: 'AND' | 'OR'
  /** Sort field. `date` → `published_at`, `modified` → `updated_at`, `name` → `slug`. */
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
 *   collection: 'post',
 *   perPage: 10,
 *   orderBy: 'date',
 * })
 * const mixed = await getQueryCollection({
 *   collection: ['post', 'page'],
 *   dictionaryIds: [4, 7],
 *   dictionaryRelation: 'AND',
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
  const include = computed(() => csv(options.include))
  const exclude = computed(() => csv(options.exclude))
  const parent = computed(() => options.parent)
  const author = computed(() => csv(options.author))
  const slug = computed(() => csv(options.slug))
  const dictionaryIds = computed(() => csv(options.dictionaryIds))
  const dictionaryRelation = computed(() => options.dictionaryRelation)
  const orderBy = computed(() => options.orderBy)
  const order = computed(() => options.order)
  const includeSet = computed(() => options.include !== undefined)
  const excludeSet = computed(() => options.exclude !== undefined)
  const parentSet = computed(() => options.parent !== undefined)
  const authorSet = computed(() => options.author !== undefined)
  const slugSet = computed(() => options.slug !== undefined)
  const dictionarySet = computed(() => options.dictionaryIds !== undefined)
  const requestFetch = useRequestFetch()

  const { data, pending, error, refresh } = await useAsyncData(
    [
      'miraicms-query',
      collection.value,
      preview.value ? '1' : '0',
      status.value ?? '',
      page.value ?? '',
      perPage.value ?? '',
      search.value ?? '',
      includeSet.value ? include.value ?? '' : '-',
      excludeSet.value ? exclude.value ?? '' : '-',
      parentSet.value ? String(parent.value ?? 0) : '-',
      authorSet.value ? author.value ?? '' : '-',
      slugSet.value ? slug.value ?? '' : '-',
      dictionarySet.value ? dictionaryIds.value ?? '' : '-',
      dictionaryRelation.value ?? '',
      orderBy.value ?? '',
      order.value ?? '',
    ].join(':'),
    () => requestFetch<QueryCollectionResponse>('/api/_miraicms/query', {
      query: {
        collection: collection.value,
        ...(preview.value ? { preview: '1' } : {}),
        ...(status.value ? { status: status.value } : {}),
        ...(page.value ? { page: page.value } : {}),
        ...(perPage.value ? { perPage: perPage.value } : {}),
        ...(search.value ? { search: search.value } : {}),
        ...(includeSet.value ? { include: include.value ?? '' } : {}),
        ...(excludeSet.value ? { exclude: exclude.value ?? '' } : {}),
        ...(parentSet.value ? { parent: parent.value ?? 0 } : {}),
        ...(authorSet.value ? { author: author.value ?? '' } : {}),
        ...(slugSet.value ? { slug: slug.value ?? '' } : {}),
        ...(dictionarySet.value ? { dictionaryIds: dictionaryIds.value ?? '' } : {}),
        ...(dictionaryRelation.value ? { dictionaryRelation: dictionaryRelation.value } : {}),
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
        include,
        includeSet,
        exclude,
        excludeSet,
        parent,
        parentSet,
        author,
        authorSet,
        slug,
        slugSet,
        dictionaryIds,
        dictionarySet,
        dictionaryRelation,
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
