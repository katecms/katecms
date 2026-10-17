import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { registerMiraiCmsField, useMiraiCmsMenuItems } from 'miraicms-nuxt/extensions'
import { clientFormBreakpoints } from './form/runtime-config'
import FormField from './internal/fields/FormField.vue'

/** Registers the Forms item in the admin menu. */

const FORM_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

export default defineNuxtPlugin(() => {
  registerMiraiCmsField('form', FormField)
  clientFormBreakpoints()
  const config = useRuntimeConfig().public.miraicms
  const admin = String(config?.adminPath || 'admin').replace(/^\/+|\/+$/g, '') || 'admin'
  const menu = useMiraiCmsMenuItems()
  if (!menu.value.some(item => item.key === 'forms')) {
    menu.value.push({
      key: 'forms',
      label: 'Forms',
      to: `/${admin}/forms`,
      icon: FORM_ICON,
    })
  }
})
