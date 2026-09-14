import type { Fields } from '@miraicms/core'
import type { ParentOption } from './collections'

export type { ParentOption }

/** Dictionary type exposed to the admin UI (from CMS config). */
export interface AdminDictionaryMeta {
  slug: string
  labels: {
    name: string
    singularName: string
  }
  fields: Fields
  collections: string[]
}

/** A dictionary term as shown in the admin UI. */
export interface AdminDictionaryTerm {
  id: number
  type: string
  slug: string
  slugPath: string
  title: string
  fields: Record<string, unknown>
  parentId: number | null
  /** Nesting level in a hierarchical list (0 = top-level). */
  depth?: number
  createdAt: string
  updatedAt: string
  canUpdate?: boolean
  canDelete?: boolean
}

export interface DictionaryListResponse {
  dictionary: AdminDictionaryMeta
  terms: AdminDictionaryTerm[]
  parents: ParentOption[]
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface DictionaryTermResponse {
  dictionary: AdminDictionaryMeta
  term: AdminDictionaryTerm
  canUpdate: boolean
  canDelete: boolean
  parents: ParentOption[]
}

export interface DictionaryTermFormModel {
  title: string
  slug: string
  parentId: number | null
  fields: Record<string, unknown>
}

/** Slim dictionary descriptors sent on `public.miraicms.dictionaries` (sidebar). */
export interface PublicDictionaryNav {
  labels: {
    name: string
    singularName: string
  }
}

export function dictionaryApi(slug: string, id?: number): string {
  const base = `/api/_miraicms/dictionaries/${encodeURIComponent(slug)}`
  if (id == null) {
    return base
  }
  return `${base}/${id}`
}
