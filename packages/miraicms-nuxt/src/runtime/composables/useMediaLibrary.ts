import { computed, ref } from 'vue'
import { $fetch } from '#imports'
import type { MediaItem } from '@miraicms/core'

/** Page size for media pickers. The library page uses the same size. */
export const MEDIA_LIBRARY_PAGE_SIZE = 40

/**
 * Paged media library for pickers.
 * `matches` runs on each loaded page so a field can hide files it cannot use.
 * `fetched` counts raw API rows, so scrolling continues past pages that were filtered out.
 */
export function useMediaLibrary(matches: () => (item: MediaItem) => boolean) {
  const items = ref<MediaItem[]>([])
  const total = ref(0)
  const fetched = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = computed(() => fetched.value < total.value)

  async function fetchPage(offset: number) {
    return $fetch<{ media: MediaItem[], total: number }>('/api/_miraicms/media', {
      query: { limit: MEDIA_LIBRARY_PAGE_SIZE, offset },
    })
  }

  function accept(list: MediaItem[]) {
    return list.filter(matches())
  }

  async function load() {
    loading.value = true
    try {
      const res = await fetchPage(0)
      total.value = res.total
      fetched.value = res.media.length
      items.value = accept(res.media)
    }
    finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) {
      return
    }
    loadingMore.value = true
    try {
      const res = await fetchPage(fetched.value)
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

  function prepend(item: MediaItem) {
    if (!matches()(item)) {
      return
    }
    const index = items.value.findIndex(entry => entry.id === item.id)
    if (index >= 0) {
      items.value[index] = item
      return
    }
    items.value = [item, ...items.value]
  }

  function replace(item: MediaItem) {
    const index = items.value.findIndex(entry => entry.id === item.id)
    if (index >= 0) {
      items.value[index] = item
    }
  }

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    load,
    loadMore,
    prepend,
    replace,
  }
}
