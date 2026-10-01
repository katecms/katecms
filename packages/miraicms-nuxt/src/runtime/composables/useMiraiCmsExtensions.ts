import { useState } from '#imports'

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
