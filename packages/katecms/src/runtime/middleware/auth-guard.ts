import { defineNuxtRouteMiddleware, navigateTo, useRequestFetch, useRuntimeConfig } from '#imports'
import type { AuthState } from '@katecms/core'
import { cmsAdminChildPath, cmsRoutePath, isCmsAdminPath } from '../utils/cms-paths'

/**
 * Global guard for CMS routes (`/admin/login`, `/admin/register`, `/admin/**`):
 *
 * 1. First-run — an empty users table sends guests to `/admin/register`.
 * 2. Guests hitting other `/admin` pages go to `/admin/login` once accounts exist.
 * 3. Authenticated users are kept out of login and register (sent to `/admin`).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const paths = useRuntimeConfig().public.katecms
  const adminPath = paths?.adminPath || 'admin'
  const login = cmsAdminChildPath(adminPath, paths?.loginPath || 'login')
  const register = cmsAdminChildPath(adminPath, paths?.registerPath || 'register')

  const path = to.path.length > 1 ? to.path.replace(/\/+$/, '') : to.path
  const isLogin = path === login
  const isRegister = path === register
  const isAdmin = isCmsAdminPath(path, adminPath) && !isLogin && !isRegister

  if (!isLogin && !isRegister && !isAdmin) {
    return
  }

  const request = useRequestFetch()
  const auth = await request<AuthState>('/api/_katecms/auth/state').catch(() => null)
  const user = auth?.user ?? null
  const hasUsers = auth?.hasUsers ?? false
  const admin = cmsRoutePath(adminPath)

  if (user) {
    if (isLogin || isRegister) {
      return navigateTo(admin)
    }
    return
  }

  const registrationOpen = paths?.registration === true
  const entry = hasUsers ? login : register

  if (isAdmin) {
    return navigateTo(entry)
  }
  if (isRegister && hasUsers && !registrationOpen) {
    return navigateTo(login)
  }
  if (isLogin && !hasUsers) {
    return navigateTo(register)
  }
})
