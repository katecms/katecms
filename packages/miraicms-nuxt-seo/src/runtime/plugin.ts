import { computed } from 'vue'
import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { MIRAICMS_COLLECTION_HOOK, useMiraiCmsEntrySidebar, useMiraiCmsMenuItems, useMiraiCmsTermPanels } from 'miraicms-nuxt/extensions'
import type { MiraiCmsPublicPage } from 'miraicms-nuxt/extensions'
import SeoEntryPanel from './components/SeoEntryPanel.vue'
import SeoTermPanel from './components/SeoTermPanel.vue'
import { useMiraiSeoHead } from './composables/useMiraiSeoHead'

function headInput(page: MiraiCmsPublicPage) {
  const term = page.isTerm.value
  const archive = page.isArchive.value
  return {
    title: term
      ? page.term.value?.title
      : (archive ? page.collection.value?.labels.name : page.entry.value?.title),
    entryId: term || archive ? null : page.entry.value?.id,
    termId: term ? page.term.value?.id : null,
    path: page.link.value,
    isArchive: archive,
  }
}

const SEO_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook(MIRAICMS_COLLECTION_HOOK, (page) => {
    useMiraiSeoHead(computed(() => headInput(page)))
  })

  nuxtApp.vueApp.component('MiraiCmsSeoEntryPanel', SeoEntryPanel)
  const sidebar = useMiraiCmsEntrySidebar()
  if (!sidebar.value.includes('MiraiCmsSeoEntryPanel')) {
    sidebar.value.push('MiraiCmsSeoEntryPanel')
  }
  nuxtApp.vueApp.component('MiraiCmsSeoTermPanel', SeoTermPanel)
  const terms = useMiraiCmsTermPanels()
  if (!terms.value.includes('MiraiCmsSeoTermPanel')) {
    terms.value.push('MiraiCmsSeoTermPanel')
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
