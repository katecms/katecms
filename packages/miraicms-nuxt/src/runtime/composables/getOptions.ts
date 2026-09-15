import { computed } from 'vue'
import { useAsyncData, useRequestFetch } from '#imports'
import { optionApi } from '../utils/options'
import type { OptionPageResponse } from '../utils/options'

export interface GetOptionsOptions {
  /** Option page slug from CMS config (e.g. `site`). */
  page: string
}

/**
 * Load stored values for an options page.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { values } = await getOptions({ page: 'site' })
 * </script>
 * ```
 */
export async function getOptions(options: GetOptionsOptions) {
  const page = computed(() => options.page)
  const requestFetch = useRequestFetch()

  const { data, pending, error, refresh } = await useAsyncData(
    `miraicms-options:${page.value}`,
    () => requestFetch<OptionPageResponse>(optionApi(page.value)),
    { watch: [page] },
  )

  const values = computed(() => data.value?.values ?? {})
  const slug = computed(() => data.value?.page.slug ?? page.value)

  return {
    slug,
    values,
    pending,
    error,
    refresh,
    page,
  }
}
