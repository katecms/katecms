import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { registerKateCmsField, useKateCmsMenuItems } from 'katecms/extensions'
import { clientFormBreakpoints } from './form/runtime-config'
import FormField from './internal/fields/FormField.vue'

/** Registers the Forms item. The admin shell shows it when menu access includes `forms`. */

const FORM_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

export default defineNuxtPlugin(() => {
  registerKateCmsField('form', FormField)
  clientFormBreakpoints()
  const config = useRuntimeConfig().public.katecms
  const admin = String(config?.adminPath || 'admin').replace(/^\/+|\/+$/g, '') || 'admin'
  const menu = useKateCmsMenuItems()
  if (menu.value.some(entry => entry.key === 'forms')) {
    return
  }
  menu.value.push({
    key: 'forms',
    label: 'Forms',
    to: `/${admin}/forms`,
    icon: FORM_ICON,
    access: 'forms',
  })
})
