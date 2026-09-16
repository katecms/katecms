import type { CollectionStatus, CollectionStatusCounts, Fields } from '@miraicms/core'

/** Collection definition exposed to the admin UI (from CMS config). */
export interface AdminCollectionMeta {
  slug: string
  labels: {
    name: string
    singularName: string
  }
  hierarchical: boolean
  autosave: boolean
  public: boolean
  has_archive: boolean | string
  rewrite?: string
  fields: Fields
}

/** Assigned dictionary term on a public collection entry. */
export interface PublicDictionaryTerm {
  id: number
  type: string
  slug: string
  slugPath: string
  title: string
  fields: Record<string, unknown>
  parentId: number | null
}

/** A collection entry as shown in the admin UI and public resolve. */
export interface AdminEntry {
  id: number
  type: string
  status: CollectionStatus
  slug: string
  slugPath: string
  title: string
  fields: Record<string, unknown>
  parentId: number | null
  /** Nesting level in a hierarchical list (0 = top-level). */
  depth?: number
  menuOrder: number
  authorId: number | null
  /** Display name for the list (name, else email). Null when unknown. */
  authorName?: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  canUpdate?: boolean
  canDelete?: boolean
  /** Selected term ids keyed by dictionary slug. */
  dictionaryIds?: Record<string, number[]>
  /** Assigned terms keyed by dictionary slug (public resolve). */
  dictionaries?: Record<string, PublicDictionaryTerm[]>
}

export interface ParentOption {
  id: number
  title: string
  slug: string
  parentId: number | null
  slugPath: string
  depth: number
}

/** Dictionary attached to a collection, with terms for the entry sidebar picker. */
export interface CollectionDictionaryPicker {
  slug: string
  labels: {
    name: string
    singularName: string
  }
  multiple: boolean
  terms: ParentOption[]
}

export interface CollectionListResponse {
  collection: AdminCollectionMeta
  entries: AdminEntry[]
  counts: CollectionStatusCounts
  page: number
  perPage: number
  total: number
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  parents?: ParentOption[]
  dictionaries?: CollectionDictionaryPicker[]
}

export interface CollectionEntryResponse {
  collection: AdminCollectionMeta
  entry: AdminEntry
  canUpdate: boolean
  canDelete: boolean
  parents?: ParentOption[]
  dictionaries?: CollectionDictionaryPicker[]
}

export interface ResolveEntryResponse {
  kind: 'entry'
  collection: AdminCollectionMeta
  entry: AdminEntry
  /** True when unpublished statuses were actually allowed for this request. */
  preview: boolean
}

export interface ResolveArchiveResponse {
  kind: 'archive'
  collection: AdminCollectionMeta
  entries: AdminEntry[]
  /** True when unpublished statuses were actually allowed for this request. */
  preview: boolean
  page: number
  perPage: number
  total: number
}

export type ResolveResponse = ResolveEntryResponse | ResolveArchiveResponse

export interface CollectionEntryFormModel {
  title: string
  slug: string
  status: CollectionStatus
  parentId: number | null
  menuOrder: number
  publishedAt: string | null
  fields: Record<string, unknown>
  /** Single: `number | null`. Multiple: `number[]`. */
  dictionaryIds: Record<string, number | number[] | null>
}

export type CollectionListFilter = 'all' | CollectionStatus

export function collectionApi(slug: string, id?: number | 'trash'): string {
  const base = `/api/_miraicms/collections/${encodeURIComponent(slug)}`
  if (id == null) {
    return base
  }
  return `${base}/${id}`
}

export function collectionStatusLabel(status: CollectionStatus): string {
  if (status === 'published') {
    return 'Published'
  }
  if (status === 'draft') {
    return 'Draft'
  }
  return 'Trash'
}

export function emptyDictionarySelection(
  pickers: CollectionDictionaryPicker[],
): Record<string, number | number[] | null> {
  return Object.fromEntries(
    pickers.map(picker => [picker.slug, picker.multiple ? [] : null]),
  )
}

export function formDictionarySelection(
  pickers: CollectionDictionaryPicker[],
  ids: Record<string, number[]> | undefined,
): Record<string, number | number[] | null> {
  const selected = ids ?? {}
  return Object.fromEntries(
    pickers.map((picker) => {
      const values = selected[picker.slug] ?? []
      return [picker.slug, picker.multiple ? values : (values[0] ?? null)]
    }),
  )
}

/** Slim collection descriptors sent on `public.miraicms.collections` (sidebar). */
export interface PublicCollectionNav {
  labels: {
    name: string
    singularName: string
  }
  icon?: string
  public?: boolean
  has_archive?: boolean | string
}
