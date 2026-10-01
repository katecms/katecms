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

export function useMiraiCmsMenuItems() {
  return useState<MiraiCmsMenuExtra[]>('miraicms:menu-items', () => [])
}
