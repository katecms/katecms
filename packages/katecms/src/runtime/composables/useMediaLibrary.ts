import { computed, ref } from 'vue'
import { $fetch } from '#imports'
import type { MediaItem } from '@katecms/core'
import {
  defaultMediaLibraryFilters,
  localUtcOffsetMinutes,
  mediaLibraryQuery,
  mediaMatchesFilters,
  monthKey,
  normalizeMediaLibraryFilters,
} from '../utils/media-library-query'
import type { MediaLibraryFilterState, MediaLibraryPage } from '../utils/media-library-query'

/** Page size for media pickers. The library page uses the same size. */
export const MEDIA_LIBRARY_PAGE_SIZE = 40

/**
 * Paged media library for pickers.
 * `matches` runs on each loaded page so a field can hide files it cannot use.
 * `fetched` counts raw API rows, so scrolling continues past pages that were filtered out.
 */
export function useMediaLibrary(
  matches: () => (item: MediaItem) => boolean,
  options?: { baseType?: 'image' },
) {
  const items = ref<MediaItem[]>([])
  const total = ref(0)
  const fetched = ref(0)
  const months = ref<string[]>([])
  const filters = ref<MediaLibraryFilterState>(defaultMediaLibraryFilters())
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = computed(() => fetched.value < total.value)
  let requestId = 0

  function fetchPage(offset: number) {
    return $fetch<MediaLibraryPage<MediaItem>>('/api/_katecms/media', {
      query: mediaLibraryQuery(filters.value, {
        limit: MEDIA_LIBRARY_PAGE_SIZE,
        offset,
      }, options?.baseType),
    })
  }

  function accept(list: MediaItem[]) {
    return list.filter(matches())
  }

  /** Image fields cannot use these types, so don't page through every rejected file. */
  function fieldHidesType(): boolean {
    return options?.baseType === 'image'
      && filters.value.type !== 'all'
      && filters.value.type !== 'image'
  }

  function rememberMonth(iso: string) {
    const key = monthKey(iso, localUtcOffsetMinutes())
    if (!key || months.value.includes(key)) {
      return
    }
    months.value = [...months.value, key].sort((a, b) => b.localeCompare(a))
  }

  async function load(loadOptions?: { resetFilters?: boolean, silent?: boolean }) {
    const id = ++requestId
    if (loadOptions?.resetFilters) {
      filters.value = defaultMediaLibraryFilters()
    }
    if (!loadOptions?.silent) {
      loading.value = true
      items.value = []
      fetched.value = 0
    }
    try {
      const res = await fetchPage(0)
      if (id !== requestId) {
        return
      }
      total.value = res.total
      months.value = res.months
      if (fieldHidesType()) {
        fetched.value = res.total
        items.value = []
        return
      }
      fetched.value = res.media.length
      items.value = accept(res.media)
    }
    finally {
      if (id === requestId && !loadOptions?.silent) {
        loading.value = false
      }
    }
  }

  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) {
      return
    }
    const id = requestId
    loadingMore.value = true
    try {
      const res = await fetchPage(fetched.value)
      if (id !== requestId) {
        return
      }
      total.value = res.total
      if (!res.media.length) {
        fetched.value = total.value
        return
      }
      fetched.value += res.media.length
      const seen = new Set(items.value.map(item => item.id))
      const next = accept(res.media).filter(item => !seen.has(item.id))
      items.value = [...items.value, ...next]
    }
    finally {
      loadingMore.value = false
    }
  }

  async function applyFilters(next: MediaLibraryFilterState) {
    filters.value = normalizeMediaLibraryFilters(next)
    await load()
  }

  function prepend(item: MediaItem) {
    if (mediaMatchesFilters(item, { ...filters.value, month: 'all' })) {
      rememberMonth(item.created_at)
    }
    if (!matches()(item) || !mediaMatchesFilters(item, filters.value)) {
      return
    }
    if (filters.value.sort !== 'date-desc') {
      void load({ silent: true })
      return
    }
    const index = items.value.findIndex(entry => entry.id === item.id)
    if (index >= 0) {
      items.value[index] = item
      return
    }
    items.value = [item, ...items.value]
    total.value += 1
  }

  function replace(item: MediaItem) {
    const index = items.value.findIndex(entry => entry.id === item.id)
    if (index >= 0) {
      items.value[index] = item
    }
  }

  return {
    items,
    total,
    months,
    filters,
    loading,
    loadingMore,
    hasMore,
    load,
    loadMore,
    applyFilters,
    prepend,
    replace,
  }
}
