import { watch } from 'vue'
import { defineNuxtPlugin, useRequestFetch, useRoute, useRuntimeConfig } from '#imports'
import type { AuthState } from '@miraicms/core'
import { registerMiraiCmsField, useMiraiCmsMenuItems } from 'miraicms-nuxt/extensions'
import { clientFormBreakpoints } from './form/runtime-config'
import FormField from './internal/fields/FormField.vue'

/** Registers the Forms item in the admin menu for roles that can read forms. */

const FORM_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

export default defineNuxtPlugin(() => {
  registerMiraiCmsField('form', FormField)
  clientFormBreakpoints()
  const config = useRuntimeConfig().public.miraicms
  const admin = String(config?.adminPath || 'admin').replace(/^\/+|\/+$/g, '') || 'admin'
  const login = String(config?.loginPath || 'login').replace(/^\/+|\/+$/g, '')
  const register = String(config?.registerPath || 'register').replace(/^\/+|\/+$/g, '')
  const menu = useMiraiCmsMenuItems()
  const route = useRoute()
  const request = useRequestFetch()
  const item = {
    key: 'forms',
    label: 'Forms',
    to: `/${admin}/forms`,
    icon: FORM_ICON,
  }
  let ticket = 0

  function setMenu(visible: boolean) {
    const index = menu.value.findIndex(entry => entry.key === 'forms')
    if (visible && index === -1) {
      menu.value.push(item)
      return
    }
    if (!visible && index !== -1) {
      menu.value.splice(index, 1)
    }
  }

  function inAdmin(path: string): boolean {
    const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path
    const root = `/${admin}`
    if (normalized === `${root}/${login}` || normalized === `${root}/${register}`) {
      return false
    }
    return normalized === root || normalized.startsWith(`${root}/`)
  }

  watch(() => route.path, async (path) => {
    const current = ++ticket
    if (!inAdmin(path)) {
      setMenu(false)
      return
    }
    const auth = await request<AuthState>('/api/_miraicms/auth/state').catch(() => null)
    if (current !== ticket) {
      return
    }
    setMenu(auth?.access?.forms === true)
  }, { immediate: true })
})
