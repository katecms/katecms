import { computed, ref } from 'vue'
import { $fetch, navigateTo, useFetch } from '#imports'
import type { AuthState, SafeUser } from '@miraicms/core'
import { useCmsPaths } from './useCmsPaths'

/**
 * Shared auth snapshot for admin UI (header profile, logout, etc.).
 * Uses a stable fetch key so multiple consumers share one request.
 */
export function useAuth() {
  const paths = useCmsPaths()
  const { data, refresh, pending, error, clear } = useFetch<AuthState>('/api/_miraicms/auth/state', {
    key: 'miraicms-auth-state',
  })

  const user = computed<SafeUser | null>(() => data.value?.user ?? null)
  const loggingOut = ref(false)

  async function logout() {
    if (loggingOut.value) {
      return
    }
    loggingOut.value = true
    try {
      await $fetch('/api/_miraicms/auth/logout', { method: 'POST' })
      clear()
      await navigateTo(paths.login)
    }
    finally {
      loggingOut.value = false
    }
  }

  return {
    user,
    authState: data,
    refresh,
    pending,
    error,
    loggingOut,
    logout,
  }
}
