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

/** Extra admin sidebar panels, registered by addons as component names. */
export interface MiraiCmsMenuExtra {
  key: string
  label: string
  to: string
  /** Inline SVG markup, same shape as the built-in menu icons. */
  icon?: string
}

export function useMiraiCmsEntrySidebar() {
  return useState<string[]>('miraicms:entry-sidebar', () => [])
}

/** Extra panels under a dictionary term form, registered by addons as component names. */
export function useMiraiCmsTermPanels() {
  return useState<string[]>('miraicms:term-panels', () => [])
}

export function useMiraiCmsMenuItems() {
  return useState<MiraiCmsMenuExtra[]>('miraicms:menu-items', () => [])
}
