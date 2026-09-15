import type { OptionFields } from '@miraicms/core'

/** Option page definition exposed to the admin UI (from CMS config). */
export interface AdminOptionMeta {
  slug: string
  labels: {
    name: string
  }
  fields: OptionFields
}

export interface OptionPageResponse {
  page: AdminOptionMeta
  values: Record<string, unknown>
  canRead: boolean
  canUpdate: boolean
}

/** Slim option page descriptors sent on `public.miraicms.options` (sidebar). */
export interface PublicOptionNav {
  labels: {
    name: string
  }
  icon?: string
}

export function optionApi(slug: string): string {
  return `/api/_miraicms/options/${encodeURIComponent(slug)}`
}
