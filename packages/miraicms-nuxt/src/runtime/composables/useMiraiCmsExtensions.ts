import type { ComputedRef } from 'vue'
import { useState } from '#imports'
import type { AdminCollectionMeta, AdminEntry, PublicDictionaryTerm } from '../utils/collections'

/** Nuxt hook fired by `getCollection()` for the current route. */
export const MIRAICMS_COLLECTION_HOOK = 'miraicms:collection' as const

/** Page resolved by `getCollection()` for the current route. */
export interface MiraiCmsPublicPage {
  isArchive: ComputedRef<boolean>
  isTerm: ComputedRef<boolean>
  entry: ComputedRef<AdminEntry | null>
  term: ComputedRef<PublicDictionaryTerm | null>
  collection: ComputedRef<AdminCollectionMeta | null>
  link: ComputedRef<string | null>
}

declare module '#app' {
  interface RuntimeNuxtHooks {
    'miraicms:collection': (page: MiraiCmsPublicPage) => void
  }
}

/** Extra admin menu items, registered by addons. */
export interface MiraiCmsMenuExtra {
  key: string
  label: string
  to: string
  /** Inline SVG markup, same shape as the built-in menu icons. */
  icon?: string
  /**
   * Resource the user must be allowed to read (`GET /api/_miraicms/menu`).
   * Omit to show the item to everyone who can open the admin.
   */
  access?: string
}

/**
 * Addon tab in the collection entry sidebar.
 * The form supplies the "Page" tab. `key: "page"` is reserved for that tab.
 */
export interface MiraiCmsEntrySidebarTab {
  key: string
  label: string
  /** Component name already registered on the Vue app. */
  component: string
}

export function useMiraiCmsEntrySidebar() {
  return useState<MiraiCmsEntrySidebarTab[]>('miraicms:entry-sidebar', () => [])
}

/** Register or replace one collection-entry sidebar tab. Addons call this from a plugin. */
export function registerMiraiCmsEntrySidebarTab(tab: MiraiCmsEntrySidebarTab) {
  const key = tab.key.trim()
  const label = tab.label.trim()
  const component = tab.component.trim()
  if (!key || key === 'page' || !label || !component) {
    return
  }
  const tabs = useMiraiCmsEntrySidebar()
  const next = { key, label, component }
  const index = tabs.value.findIndex(item => item.key === key)
  if (index === -1) {
    tabs.value.push(next)
    return
  }
  tabs.value[index] = next
}

/** Extra panels under a dictionary term form, registered by addons as component names. */
export function useMiraiCmsTermPanels() {
  return useState<string[]>('miraicms:term-panels', () => [])
}

export function useMiraiCmsMenuItems() {
  return useState<MiraiCmsMenuExtra[]>('miraicms:menu-items', () => [])
}

export { registerMiraiCmsField } from '../utils/helpers'
export { provideMiraiCmsFieldErrors } from '../utils/field-errors'
