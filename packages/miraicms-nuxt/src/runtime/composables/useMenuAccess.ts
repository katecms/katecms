import { useAsyncData, useRequestFetch } from '#imports'

export interface MenuAccess {
  visible: string[]
}

/**
 * Resources the current user may read, for addon menu items.
 * Fetched once per admin shell. A later sign-in loads it again.
 */
export function useMenuAccess() {
  const request = useRequestFetch()
  return useAsyncData(
    'miraicms-menu',
    () => request<MenuAccess>('/api/_miraicms/menu'),
    {
      getCachedData: (key, nuxtApp, ctx) => {
        if (nuxtApp.isHydrating && ctx.cause === 'initial') {
          return nuxtApp.payload.data[key] as MenuAccess | undefined
        }
        return undefined
      },
    },
  )
}
