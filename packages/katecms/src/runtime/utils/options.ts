import type { OptionFields } from '@katecms/core'

/** Option page definition exposed to the admin UI (from CMS config). */
export interface AdminOptionMeta {
  slug: string
  label: string
  fields: OptionFields
}

export interface OptionPageResponse {
  page: AdminOptionMeta
  values: Record<string, unknown>
  canRead: boolean
  canUpdate: boolean
}

/** Slim option page descriptors sent on `public.katecms.options` (sidebar). */
export interface PublicOptionNav {
  label: string
  icon?: string
}

export function optionApi(slug: string): string {
  return `/api/_katecms/options/${encodeURIComponent(slug)}`
}
