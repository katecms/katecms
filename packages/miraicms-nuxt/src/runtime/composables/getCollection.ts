import { computed } from 'vue'
import { /* createError, */ useAsyncData, useRequestFetch, useRoute } from '#imports'
import { buildPublicPath, resolveArchivePath } from '@miraicms/core'
import type { AdminEntry, ResolveResponse } from '../utils/collections'
import { isTruthyQueryParam, parsePublicStatusParam } from '../utils/preview'

function useCurrentPublicPath() {
  const route = useRoute()
  return computed(() => {
    const slugParam = route.params.slug
    if (Array.isArray(slugParam) && slugParam.length > 0) {
      return `/${slugParam.map(String).join('/')}`
    }
    if (typeof slugParam === 'string' && slugParam) {
      return `/${slugParam}`
    }
    const path = route.path || '/'
    return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
  })
}

// function resolveFetchError(err: unknown): { statusCode: number, statusMessage: string } {
//   const e = err as {
//     statusCode?: number
//     statusMessage?: string
//     message?: string
//     data?: { statusCode?: number, statusMessage?: string, message?: string }
//   } | null
//
//   const statusCode = e?.data?.statusCode || e?.statusCode || 404
//   const statusMessage = e?.data?.statusMessage
//     || e?.statusMessage
//     || e?.data?.message
//     || 'Page not found.'
//
//   return { statusCode, statusMessage }
// }

function statusQueryValue(
  status: GetCollectionOptions['status'],
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

export interface GetCollectionOptions {
  /** Override the path (default: current route). */
  path?: string
  /**
   * Include drafts when the requester may `collections:read` the matched
   * collection. Also read from `?preview=1` on the current route.
   */
  preview?: boolean
  /**
   * Narrow statuses. `draft` is ignored unless preview is granted.
   * Also read from `?status=` on the current route.
   */
  status?: 'published' | 'draft' | Array<'published' | 'draft'>
  /** Archive listing page. Also read from `?page=` on the current route. */
  page?: number
  /**
   * Archive listing page size. Also read from `?perPage=` on the current route.
   * Default: the matched collection's `perPage` (10). `-1` returns every entry.
   */
  perPage?: number
}

/**
 * Resolve the CMS entry or archive for the current (or given) path via
 * collection `rewrite` / `has_archive`.
 *
 * Public pages stay published-only unless `preview` is set (option or
 * `?preview=1`) and the visitor is signed in with read access.
 * Collections with `public: false` do not resolve.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { entry, link } = await getCollection()
 * const preview = await getCollection({ preview: true, status: 'draft' })
 * const { isArchive, entries } = await getCollection()
 * </script>
 * ```
 */
export async function getCollection(options: GetCollectionOptions = {}) {
  const route = useRoute()
  const currentPath = useCurrentPublicPath()
  const path = computed(() => options.path || currentPath.value)
  const preview = computed(() => options.preview ?? isTruthyQueryParam(route.query.preview))
  const status = computed(() =>
    statusQueryValue(options.status)
    ?? ((parsePublicStatusParam(route.query.status) ?? []).join(',') || undefined),
  )
  const page = computed(() => pageQueryValue(route.query.page, options.page))
  const perPage = computed(() => pageQueryValue(route.query.perPage, options.perPage, true))
  const requestFetch = useRequestFetch()

  const { data, pending, error, refresh } = await useAsyncData(
    `miraicms-resolve:${path.value}:${preview.value ? '1' : '0'}:${status.value ?? ''}:${page.value ?? ''}:${perPage.value ?? ''}`,
    () => requestFetch<ResolveResponse>('/api/_miraicms/resolve', {
      query: {
        path: path.value,
        ...(preview.value ? { preview: '1' } : {}),
        ...(status.value ? { status: status.value } : {}),
        ...(page.value ? { page: page.value } : {}),
        ...(perPage.value ? { perPage: perPage.value } : {}),
      },
    }),
    { watch: [path, preview, status, page, perPage] },
  )

  const resolved = data.value
  const isArchivePayload = resolved?.kind === 'archive'
  const isTermPayload = resolved?.kind === 'term'
  if (error.value || !resolved || (!isArchivePayload && !isTermPayload && resolved.kind !== 'entry')) {
    // const { statusCode, statusMessage } = resolveFetchError(error.value)
    // throw createError({ statusCode, statusMessage })
    return []
  }
  if (resolved.kind === 'entry' && !resolved.entry) {
    return []
  }
  if (resolved.kind === 'term' && !resolved.term) {
    return []
  }

  const kind = computed(() => data.value?.kind ?? 'entry')
  const isArchive = computed(() => data.value?.kind === 'archive')
  const isTerm = computed(() => data.value?.kind === 'term')
  const entry = computed(() => data.value?.kind === 'entry' ? data.value.entry : null)
  const term = computed(() => data.value?.kind === 'term' ? data.value.term : null)
  const termPath = computed(() => data.value?.kind === 'term' ? data.value.path : null)
  const entries = computed(() => {
    if (data.value?.kind === 'archive' || data.value?.kind === 'term') {
      return data.value.entries
    }
    return []
  })
  const collection = computed(() => data.value?.collection ?? null)
  const isPreview = computed(() => data.value?.preview === true)
  const archivePage = computed(() => data.value?.kind === 'archive' ? data.value.page : 1)
  const archivePerPage = computed(() => data.value?.kind === 'archive' ? data.value.perPage : 0)
  const total = computed(() => data.value?.kind === 'archive' ? data.value.total : 0)
  const link = computed(() => {
    if (data.value?.kind === 'term') {
      return data.value.path
    }
    const meta = collection.value
    if (!meta) {
      return null
    }
    if (data.value?.kind === 'archive') {
      return resolveArchivePath(meta, meta.slug)
    }
    const resolvedEntry = entry.value
    if (!resolvedEntry) {
      return null
    }
    return buildPublicPath(meta.rewrite, meta.slug, resolvedEntry.slugPath || resolvedEntry.slug)
  })

  function permalink(item: AdminEntry): string | null {
    const meta = collection.value
    if (!meta || !meta.public) {
      return null
    }
    return buildPublicPath(meta.rewrite, meta.slug, item.slugPath || item.slug)
  }

  return {
    kind,
    isArchive,
    isTerm,
    entry,
    term,
    termPath,
    entries,
    collection,
    link,
    permalink,
    preview: isPreview,
    page: archivePage,
    perPage: archivePerPage,
    total,
    pending,
    error,
    refresh,
    path,
  }
}
