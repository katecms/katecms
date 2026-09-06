import { defineNuxtRouteMiddleware, navigateTo, useRequestFetch, useRuntimeConfig } from '#imports'
import type { AuthState } from '@miraicms/core'
import { cmsRoutePath, isCmsAdminPath } from '../utils/cms-paths'

/**
 * Global guard for CMS routes (`/login`, `/register`, `/admin/**`):
 *
 * 1. First-run — an empty users table sends guests to `/register`.
 * 2. Guests hitting `/admin` go to `/login` once accounts exist.
 * 3. Authenticated users are kept out of `/login` and `/register` (sent to `/admin`).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const paths = useRuntimeConfig().public.miraicms
  const login = cmsRoutePath(paths?.loginPath || 'login')
  const register = cmsRoutePath(paths?.registerPath || 'register')
  const adminPath = paths?.adminPath || 'admin'

  const path = to.path
  const isLogin = path === login
  const isRegister = path === register
  const isAdmin = isCmsAdminPath(path, adminPath)

  if (!isLogin && !isRegister && !isAdmin) {
    return
  }

  const request = useRequestFetch()
  const auth = await request<AuthState>('/api/_miraicms/auth/state').catch(() => null)
  const user = auth?.user ?? null
  const hasUsers = auth?.hasUsers ?? false
  const admin = cmsRoutePath(adminPath)

  if (user) {
    if (isLogin || isRegister) {
      return navigateTo(admin)
    }
    return
  }

  const entry = hasUsers ? login : register

  if (isAdmin) {
    return navigateTo(entry)
  }
  if (isLogin && !hasUsers) {
    return navigateTo(register)
  }
})
