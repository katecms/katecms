import { computed } from 'vue'
import { useAsyncData, useRequestFetch } from '#imports'
import type { FieldsQuery, QueryTermsResult, TermOrderBy, TermOrderField, TermsReturn } from '@katecms/core'

export interface GetTermsOptions {
  /** Dictionary slug(s). */
  dictionary: string | string[]
  /**
   * Page size. Omitted or `-1` returns every match.
   */
  perPage?: number
  /** How many matches to skip. Default: `0`. */
  offset?: number
  /** Only these term ids. */
  includeIds?: number | number[]
  /** Skip these term ids. */
  excludeIds?: number | number[]
  /** Skip these terms and every descendant. */
  excludeTreeIds?: number | number[]
  /** Direct parent. `null` / `0` is top-level. */
  parentId?: number | null
  /** Every descendant of this term. The term itself is not included. */
  childOf?: number
  /** Skip terms that have children. Default: `false`. */
  childless?: boolean
  /** Exact slug(s). */
  slug?: string | string[]
  /** Exact title(s). */
  title?: string | string[]
  /** Case-insensitive substring of title or slug. */
  search?: string
  /** Hide terms with no published entries. Default: `true`. */
  hideEmpty?: boolean
  /**
   * When `hideEmpty` is set, keep an empty term if a descendant has entries.
   * Default: `true`.
   */
  hierarchical?: boolean
  /** Add descendant entry counts to each term's `count`. Default: `false`. */
  padCounts?: boolean
  /** Filter term `fields`. */
  fieldsQuery?: FieldsQuery
  /** Default: `title`. */
  orderBy?: TermOrderBy
  /** Key used when `orderBy` is `field`. */
  orderByField?: TermOrderField
  /** Default: `asc`. */
  order?: 'asc' | 'desc'
  /**
   * Shape of the result. `count` is the number of matches before `perPage`.
   * Default: `all`.
   */
  return?: TermsReturn
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

function flag(value: boolean | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  return value ? '1' : '0'
}

/**
 * List dictionary terms.
 *
 * `count` is the number of published entries in public collections.
 * `hideEmpty` drops terms whose count is 0, unless `hierarchical` keeps a
 * parent that has a non-empty descendant.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { terms } = await getTerms({
 *   dictionary: 'services',
 *   hideEmpty: true,
 *   orderBy: 'title',
 * })
 * </script>
 * ```
 */
export async function getTerms(options: GetTermsOptions) {
  const dictionary = computed(() => asList(options.dictionary).join(','))
  const perPage = computed(() => options.perPage)
  const offset = computed(() => options.offset)
  const includeIds = computed(() => csv(options.includeIds))
  const excludeIds = computed(() => csv(options.excludeIds))
  const excludeTreeIds = computed(() => csv(options.excludeTreeIds))
  const parentId = computed(() => {
    if (options.parentId === undefined) {
      return undefined
    }
    if (options.parentId == null || options.parentId === 0) {
      return '0'
    }
    return String(options.parentId)
  })
  const childOf = computed(() => (
    options.childOf != null && options.childOf > 0 ? String(options.childOf) : undefined
  ))
  const childless = computed(() => flag(options.childless))
  const slug = computed(() => csv(options.slug))
  const title = computed(() => csv(options.title))
  const search = computed(() => options.search)
  const hideEmpty = computed(() => flag(options.hideEmpty))
  const hierarchical = computed(() => flag(options.hierarchical))
  const padCounts = computed(() => flag(options.padCounts))
  const fieldsQuery = computed(() => (
    options.fieldsQuery ? JSON.stringify(options.fieldsQuery) : undefined
  ))
  const orderBy = computed(() => options.orderBy)
  const orderByField = computed(() => (
    options.orderByField ? JSON.stringify(options.orderByField) : undefined
  ))
  const order = computed(() => options.order)
  const returnMode = computed(() => options.return)
  const includeIdsSet = computed(() => options.includeIds !== undefined)
  const excludeIdsSet = computed(() => options.excludeIds !== undefined)
  const excludeTreeIdsSet = computed(() => options.excludeTreeIds !== undefined)
  const slugSet = computed(() => options.slug !== undefined)
  const titleSet = computed(() => options.title !== undefined)
  const requestFetch = useRequestFetch()

  const { data, pending, error, refresh } = await useAsyncData(
    [
      'katecms-terms',
      dictionary.value,
      perPage.value ?? '',
      offset.value ?? '',
      includeIdsSet.value ? includeIds.value ?? '' : '-',
      excludeIdsSet.value ? excludeIds.value ?? '' : '-',
      excludeTreeIdsSet.value ? excludeTreeIds.value ?? '' : '-',
      parentId.value ?? '-',
      childOf.value ?? '',
      childless.value ?? '',
      slugSet.value ? slug.value ?? '' : '-',
      titleSet.value ? title.value ?? '' : '-',
      search.value ?? '',
      hideEmpty.value ?? '',
      hierarchical.value ?? '',
      padCounts.value ?? '',
      fieldsQuery.value ?? '',
      orderBy.value ?? '',
      orderByField.value ?? '',
      order.value ?? '',
      returnMode.value ?? '',
    ].join(':'),
    () => requestFetch<QueryTermsResult>('/api/_katecms/terms', {
      query: {
        dictionary: dictionary.value,
        ...(perPage.value != null ? { perPage: perPage.value } : {}),
        ...(offset.value != null ? { offset: offset.value } : {}),
        ...(includeIdsSet.value ? { includeIds: includeIds.value ?? '' } : {}),
        ...(excludeIdsSet.value ? { excludeIds: excludeIds.value ?? '' } : {}),
        ...(excludeTreeIdsSet.value ? { excludeTreeIds: excludeTreeIds.value ?? '' } : {}),
        ...(parentId.value != null ? { parentId: parentId.value } : {}),
        ...(childOf.value ? { childOf: childOf.value } : {}),
        ...(childless.value != null ? { childless: childless.value } : {}),
        ...(slugSet.value ? { slug: slug.value ?? '' } : {}),
        ...(titleSet.value ? { title: title.value ?? '' } : {}),
        ...(search.value ? { search: search.value } : {}),
        ...(hideEmpty.value != null ? { hideEmpty: hideEmpty.value } : {}),
        ...(hierarchical.value != null ? { hierarchical: hierarchical.value } : {}),
        ...(padCounts.value != null ? { padCounts: padCounts.value } : {}),
        ...(fieldsQuery.value ? { fieldsQuery: fieldsQuery.value } : {}),
        ...(orderBy.value ? { orderBy: orderBy.value } : {}),
        ...(orderByField.value ? { orderByField: orderByField.value } : {}),
        ...(order.value ? { order: order.value } : {}),
        ...(returnMode.value ? { return: returnMode.value } : {}),
      },
    }),
    {
      watch: [
        dictionary,
        perPage,
        offset,
        includeIds,
        includeIdsSet,
        excludeIds,
        excludeIdsSet,
        excludeTreeIds,
        excludeTreeIdsSet,
        parentId,
        childOf,
        childless,
        slug,
        slugSet,
        title,
        titleSet,
        search,
        hideEmpty,
        hierarchical,
        padCounts,
        fieldsQuery,
        orderBy,
        orderByField,
        order,
        returnMode,
      ],
    },
  )

  const terms = computed(() => data.value?.terms ?? [])
  const ids = computed(() => data.value?.ids ?? [])
  const titles = computed(() => data.value?.titles ?? [])
  const map = computed(() => data.value?.map ?? {})
  const total = computed(() => data.value?.total ?? 0)

  return {
    terms,
    ids,
    titles,
    map,
    total,
    pending,
    error,
    refresh,
  }
}
