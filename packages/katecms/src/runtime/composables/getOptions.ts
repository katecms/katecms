import { computed } from 'vue'
import { useAsyncData, useRequestFetch } from '#imports'
import { optionApi } from '../utils/options'
import type { OptionPageResponse } from '../utils/options'

export interface GetOptionsOptions {
  /** Option page slug from CMS config (e.g. `site`). */
  option: string
}

/**
 * Load stored values for an options page.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { values } = await getOptions({ option: 'site' })
 * </script>
 * ```
 */
export async function getOptions(options: GetOptionsOptions) {
  const option = computed(() => options.option)
  const requestFetch = useRequestFetch()

  const { data, pending, error, refresh } = await useAsyncData(
    `katecms-options:${option.value}`,
    () => requestFetch<OptionPageResponse>(optionApi(option.value)),
    { watch: [option] },
  )

  const values = computed(() => data.value?.values ?? {})
  const slug = computed(() => data.value?.page.slug ?? option.value)

  return {
    slug,
    values,
    pending,
    error,
    refresh,
    option,
  }
}
