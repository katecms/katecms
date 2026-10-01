import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { useMiraiCmsEntrySidebar, useMiraiCmsMenuItems } from 'miraicms-nuxt/extensions'
import SeoEntryPanel from './components/SeoEntryPanel.vue'

const SEO_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('MiraiSeoEntryPanel', SeoEntryPanel)
  const sidebar = useMiraiCmsEntrySidebar()
  if (!sidebar.value.includes('MiraiSeoEntryPanel')) {
    sidebar.value.push('MiraiSeoEntryPanel')
  }

  const config = useRuntimeConfig().public.miraicms
  const admin = String(config?.adminPath || 'admin').replace(/^\/+|\/+$/g, '') || 'admin'
  const menu = useMiraiCmsMenuItems()
  if (!menu.value.some(item => item.key === 'seo')) {
    menu.value.push({
      key: 'seo',
      label: 'SEO',
      to: `/${admin}/seo`,
      icon: SEO_ICON,
    })
  }
})
