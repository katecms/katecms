import { computed } from 'vue'
import { /* createError, */ useAsyncData, useRequestFetch, useRoute } from '#imports'
import { buildPublicPath } from '@miraicms/core'
import type { ResolveResponse } from '../utils/collections'
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
}

/**
 * Resolve the CMS entry for the current (or given) path via collection `rewrite`.
 *
 * Public pages stay published-only unless `preview` is set (option or
 * `?preview=1`) and the visitor is signed in with read access.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { entry, link } = await getCollection()
 * const preview = await getCollection({ preview: true, status: 'draft' })
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
  const requestFetch = useRequestFetch()

  const { data, pending, error, refresh } = await useAsyncData(
    `miraicms-resolve:${path.value}:${preview.value ? '1' : '0'}:${status.value ?? ''}`,
    () => requestFetch<ResolveResponse>('/api/_miraicms/resolve', {
      query: {
        path: path.value,
        ...(preview.value ? { preview: '1' } : {}),
        ...(status.value ? { status: status.value } : {}),
      },
    }),
    { watch: [path, preview, status] },
  )

  if (error.value || !data.value?.entry) {
    // const { statusCode, statusMessage } = resolveFetchError(error.value)
    // throw createError({ statusCode, statusMessage })
    return []
  }

  const entry = computed(() => data.value?.entry ?? null)
  const collection = computed(() => data.value?.collection ?? null)
  const isPreview = computed(() => data.value?.preview === true)
  const link = computed(() => {
    const resolved = entry.value
    const meta = collection.value
    if (!resolved || !meta) {
      return null
    }
    return buildPublicPath(meta.rewrite, meta.slug, resolved.slugPath || resolved.slug)
  })

  return {
    entry,
    collection,
    link,
    preview: isPreview,
    pending,
    error,
    refresh,
    path,
  }
}
