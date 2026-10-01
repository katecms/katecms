import { buildPublicPath } from '@miraicms/core'
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
  multiple: boolean
  hierarchical: boolean
  public: boolean
  rewrite?: string
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
  icon?: string
}

/** Public term URL, or `null` when the dictionary is not public. */
export function dictionaryTermUrl(
  dictionary: Pick<AdminDictionaryMeta, 'slug' | 'public' | 'rewrite'>,
  slugPath: string,
): string | null {
  if (!dictionary.public || !slugPath) {
    return null
  }
  return buildPublicPath(dictionary.rewrite, dictionary.slug, slugPath)
}

export function dictionaryApi(slug: string, id?: number): string {
  const base = `/api/_miraicms/dictionaries/${encodeURIComponent(slug)}`
  if (id == null) {
    return base
  }
  return `${base}/${id}`
}
